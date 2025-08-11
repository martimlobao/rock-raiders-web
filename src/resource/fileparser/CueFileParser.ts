import { ByteStreamReader } from '../../core/ByteStreamReader'
import { VERBOSE } from '../../params'

export interface CueFile {
    isoFile: ArrayBuffer
    audioTracks: ArrayBuffer[]
}

export class CueFileParser {
    readonly hdrParser: CueHdrFileParser

    constructor(cueFileBuffer: ArrayBuffer, readonly binFileBuffer: ArrayBuffer) {
        this.hdrParser = new CueHdrFileParser(cueFileBuffer)
    }

    async parse(): Promise<CueFile> {
        let isoFile: ArrayBuffer | undefined
        const audioTracks: ArrayBuffer[] = []
        const cueEntries = this.hdrParser.parseEntries()
        if (VERBOSE) console.log('Entries found in CUE file', cueEntries)
        const binFileBuffer = this.binFileBuffer
        console.log(`BIN file size: ${binFileBuffer.byteLength} bytes`)
        console.log(`Expected sectors: ${Math.floor(binFileBuffer.byteLength / 2352)}`)

        for (let c = 0; c < cueEntries.length; c++) {
            const cueEntry = cueEntries[c]
            switch (cueEntry.track.type) {
                case 'MODE1': {
                    const chunkSize = cueEntry.track.bitrate || 2352
                    if (chunkSize !== 2352) console.warn(`Expected bitrate 2352 but got (${chunkSize}) instead`)

                    const startSector = cueEntry.index.sector
                    console.log(`Track ${cueEntry.track.number} MODE1: start sector ${startSector} (${cueEntry.index.minute}:${cueEntry.index.second}:${cueEntry.index.frame})`)
                    // For MODE1/2352, each sector is 2352 bytes but contains 2048 bytes of data
                    // The data starts at offset 16 within each sector
                    const startOffset = startSector * chunkSize + 16

                    // Find the next track to determine end boundary
                    let endSector: number
                    if (c + 1 < cueEntries.length) {
                        endSector = cueEntries[c + 1].index.sector
                        console.log(`Next track starts at sector ${endSector}`)
                    } else {
                        // Last track - estimate end based on file size
                        endSector = Math.floor(binFileBuffer.byteLength / chunkSize)
                        console.log(`Last track, estimated end sector: ${endSector}`)
                    }

                    // For MODE1 tracks, we need to find the actual end of the data
                    // CD-ROM data tracks typically end before the next track starts
                    // Let's look for a more reasonable boundary
                    if (endSector - startSector > 10000) { // If more than 10k sectors, something's wrong
                        console.warn(`Suspicious sector range: ${startSector} to ${endSector} (${endSector - startSector} sectors)`)
                        // Try to find a more reasonable end by looking at the file size
                        const maxSectors = Math.floor((binFileBuffer.byteLength - startOffset) / chunkSize)
                        if (maxSectors < endSector - startSector) {
                            console.log(`Adjusting end sector from ${endSector} to ${startSector + maxSectors} based on file size`)
                            endSector = startSector + maxSectors
                        }
                    }

                    console.log(`Track ${cueEntry.track.number}: sectors ${startSector} to ${endSector}, chunk size: ${chunkSize}`)
                    console.log(`Start offset: ${startOffset}, end offset: ${endSector * chunkSize + 16}`)

                    const endOffset = endSector * chunkSize + 16
                    const entryLength = (endSector - startSector) * 2048 // 2048 bytes per sector of actual data

                    console.log(`Reading ISO with chunk size ${chunkSize} from start offset ${startOffset} sector ${startSector} to end offset ${endOffset} sector ${endSector} and final iso length ${entryLength}`)

                    // Validate that we're not trying to read past the end of the file
                    if (endOffset > binFileBuffer.byteLength) {
                        console.warn(`End offset ${endOffset} exceeds file size ${binFileBuffer.byteLength}, adjusting`)
                        endSector = Math.floor((binFileBuffer.byteLength - 16) / chunkSize)
                        const adjustedEntryLength = (endSector - startSector) * 2048
                        console.log(`Adjusted to sectors ${startSector} to ${endSector}, length: ${adjustedEntryLength}`)
                    }

                    const entryData = new Uint8Array(entryLength)
                    let writeOffset = 0

                    // Extract 2048 bytes from each 2352-byte sector
                    for (let sector = startSector; sector < endSector; sector++) {
                        const sectorOffset = sector * chunkSize + 16 // Skip 16-byte header
                        if (sectorOffset + 2048 > binFileBuffer.byteLength) {
                            console.warn(`Sector ${sector} would read past end of file, stopping`)
                            break
                        }
                        const isoBuffer = binFileBuffer.slice(sectorOffset, sectorOffset + 2048)
                        if (isoBuffer.byteLength !== 2048) {
                            console.warn(`Sector ${sector}: expected 2048 bytes, got ${isoBuffer.byteLength}`)
                        }
                        entryData.set(new Uint8Array(isoBuffer), writeOffset)
                        writeOffset += 2048
                    }

                    // Adjust the final buffer size to match what we actually read
                    const actualLength = writeOffset
                    if (actualLength !== entryLength) {
                        console.log(`Adjusting buffer size from ${entryLength} to ${actualLength} bytes`)
                        isoFile = entryData.slice(0, actualLength).buffer
                    } else {
                        isoFile = entryData.buffer
                    }

                    console.log(`Extracted ISO buffer: ${isoFile.byteLength} bytes, expected: ${entryLength} bytes`)

                    // Validate the extracted ISO data
                    if (isoFile.byteLength < 32 * 1024) {
                        console.error(`Extracted ISO too small: ${isoFile.byteLength} bytes, need at least 32KB`)
                    }
                    break
                }
                case 'AUDIO': {
                    const startOffset = cueEntry.index.sector * 2352
                    const endOffset = !!cueEntries[c + 1] ? cueEntries[c + 1].index.sector * 2352 : binFileBuffer.byteLength
                    const audioBuffer = this.readAudioEntry(binFileBuffer, startOffset, endOffset)
                    audioTracks.push(audioBuffer)
                    break
                }
                default:
                    throw new Error(`Unexpected cue entry track type "${cueEntry.track.type}"`)
            }
        }
        if (!isoFile) throw new Error('Invalid CUE/BIN files given; no iso image contained')
        return {isoFile: isoFile, audioTracks: audioTracks}
    }

    private readAudioEntry(binFileBuffer: ArrayBuffer, startOffset: number, endOffset: number): ArrayBuffer {
        const headerLen = 44
        const entryDataLength = endOffset - startOffset
        const trackArr = new Uint8Array(headerLen + entryDataLength)
        const trackView = new DataView(trackArr.buffer)
        // Write WAV header at start of buffer
        const encoder = new TextEncoder()
        trackArr.set(encoder.encode('RIFF')) // RIFF header
        trackView.setUint32(4, entryDataLength + 8 + 24 + 4, true) // length of file, starting from WAVE
        trackArr.set(encoder.encode('WAVE'), 8)
        trackArr.set(encoder.encode('fmt '), 12) // FORMAT header
        trackView.setUint32(16, 16, true) // length of FORMAT header
        trackView.setUint16(20, 1, true) // constant
        trackView.setUint16(22, 2, true) // channels
        trackView.setUint32(24, 44100, true) // sample rate
        trackView.setUint32(28, 44100 * 4, true) // bytes per second
        trackView.setUint16(32, 4, true) // bytes per sample
        trackView.setUint16(34, 16, true) // bits per channel
        trackArr.set(encoder.encode('data'), 36) // DATA header
        trackView.setUint32(40, entryDataLength, true)
        for (let offset = startOffset; offset < endOffset; offset += 2352) {
            const read = binFileBuffer.slice(offset, offset + 2352)
            trackArr.set(new Uint8Array(read), headerLen + offset - startOffset)
        }
        return trackArr.buffer
    }
}

export class CueHdrFileParser {
    readonly reader: ByteStreamReader

    constructor(readonly buffer: ArrayBuffer) {
        if (buffer.byteLength > 2000) throw new Error(`Unexpected CUE file length! Got ${buffer.byteLength} expected max 2000 bytes`)
        this.reader = new ByteStreamReader(new DataView(buffer))
    }

    parseEntries(): CueEntry[] {
        const content = this.reader.readString(this.buffer.byteLength)
        const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => !!l)
        const binFileLine = lines.find((l) => l.toUpperCase().startsWith('FILE '))
        if (!binFileLine) throw new Error('Invalid CUE file! No line starts with "FILE " keyword')
        const binFileParts = binFileLine.split(/\s+/)
        if (binFileParts.length !== 3) throw new Error(`Unexpected FILE line given! Expected "FILE "ROCKRAIDERS.bin" BINARY" but got "${binFileLine}" instead`)
        if (binFileParts[2].toUpperCase() !== 'BINARY') throw new Error(`Unexpected BIN file mode given! Expected BINARY got ${binFileParts[2]} instead`)
        const result: CueEntry[] = []

        // Parse tracks and their associated lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (!line.toUpperCase().startsWith('TRACK ')) continue

            const track = this.parseTrackLine(line)
            let index: CuePosition | undefined
            let pregap: CuePosition | undefined

            // Look ahead for INDEX and PREGAP lines
            for (let j = i + 1; j < lines.length && !lines[j].toUpperCase().startsWith('TRACK '); j++) {
                const nextLine = lines[j]
                if (nextLine.toUpperCase().startsWith('INDEX ')) {
                    index = this.parseIndexLine(nextLine)
                } else if (nextLine.toUpperCase().startsWith('PREGAP ')) {
                    pregap = this.parsePregapLine(nextLine)
                }
            }

            if (!index) throw new Error(`Missing INDEX line for TRACK ${track.number}`)

            result.push({
                track,
                index,
                pregap
            })
        }

        result.sort((l, r) => l.track.number - r.track.number)
        return result
    }

    private parseTrackLine(line: string): CueTrack {
        if (!line.startsWith('TRACK ')) throw new Error(`Invalid TRACK line "${line}" given!`)
        const parts = line.split(/\s+/)
        if (parts.length !== 3) throw new Error(`Unexpected TRACK line "${line}" given!`)
        const typeSplit = parts[2].split('/')
        const typeUpper = typeSplit[0].toUpperCase()
        if (typeUpper !== 'MODE1' && typeUpper !== 'AUDIO') throw new Error(`Unexpected type "${typeSplit[0]}" given`)
        return {
            number: Number(parts[1]),
            type: typeUpper,
            bitrate: !!typeSplit[1] ? Number(typeSplit[1]) : undefined
        }
    }

    private parseIndexLine(line: string): CuePosition {
        if (!line.startsWith('INDEX ')) throw new Error(`Invalid INDEX line "${line}" given!`)
        const parts = line.split(/\s+/)
        if (parts.length !== 3) throw new Error(`Unexpected INDEX line "${line}" given!`)
        const timePart = parts[2]
        const posSplit = timePart.split(':')
        if (posSplit.length !== 3) throw new Error(`Invalid timestamp "${timePart}" in line "${line}"`)
        return {
            minute: Number(posSplit[0]),
            second: Number(posSplit[1]),
            frame: Number(posSplit[2]),
            sector: Number(posSplit[0]) * 60 * 75 + Number(posSplit[1]) * 75 + Number(posSplit[2]), // 75 frames per second of audio
        }
    }

    private parsePregapLine(line: string): CuePosition {
        if (!line.startsWith('PREGAP ')) throw new Error(`Invalid PREGAP line "${line}" given!`)
        const timePart = line.substring('PREGAP '.length).trim()
        const posSplit = timePart.split(':')
        if (posSplit.length !== 3) throw new Error(`Invalid timestamp "${timePart}" in line "${line}"`)
        return {
            minute: Number(posSplit[0]),
            second: Number(posSplit[1]),
            frame: Number(posSplit[2]),
            sector: Number(posSplit[0]) * 60 * 75 + Number(posSplit[1]) * 75 + Number(posSplit[2]), // 75 frames per second of audio
        }
    }
}

export interface CueEntry {
    track: CueTrack
    index: CuePosition
    pregap?: CuePosition
}

export interface CueTrack {
    number: number
    type: 'MODE1' | 'AUDIO'
    bitrate?: number
}

export interface CuePosition {
    minute: number
    second: number
    frame: number
    sector: number
}
