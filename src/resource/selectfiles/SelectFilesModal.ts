import './SelectFilesModal.css'
import { VFSEncoding, VirtualFileSystem } from '../fileparser/VirtualFileSystem'
import { SelectFilesAccordion } from './SelectFilesAccordion'
import { SelectFilesForm } from './SelectFilesForm'
import { CabFile } from '../fileparser/CabFile'
import { cachePutData, cacheGetData } from '../AssetCacheHelper'
import { VirtualFile } from '../fileparser/VirtualFile'
import { IsoFileParser } from '../fileparser/IsoFileParser'
import { CueFileParser } from '../fileparser/CueFileParser'
import { SelectFilesProgress } from './SelectFilesProgress'
import { ZipFileParser } from '../fileparser/ZipFileParser'
import { BundledGameLoader } from './BundledGameLoader'

interface ZipPackConf {
    flag: string
    name: string
    encoding: VFSEncoding
}

interface WadFilesConf {
    flag: string
    code: string
    name: string
    encoding: VFSEncoding
}

export class SelectFilesModal {
    static readonly zipPacks: ZipPackConf[] = [
        {flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 / 🇺🇸', name: 'English', encoding: 'default'},
        {flag: '🇩🇪', name: 'German', encoding: 'default'},
        {flag: '🇩🇰', name: 'Danish', encoding: 'default'},
        {flag: '🇳🇱', name: 'Dutch', encoding: 'default'},
        {flag: '🇮🇱', name: 'Hebrew', encoding: 'windows-1255'},
        {flag: '🇮🇹', name: 'Italian', encoding: 'default'},
        {flag: '🇳🇴', name: 'Norwegian', encoding: 'default'},
        {flag: '🇵🇱', name: 'Polish', encoding: 'windows-1250'},
        {flag: '🇷🇺', name: 'Russian', encoding: 'windows-1251'},
        {flag: '🇪🇸', name: 'Spanish', encoding: 'default'},
        {flag: '🇸🇪', name: 'Swedish', encoding: 'default'},
        {flag: '🇫🇷', name: 'French', encoding: 'default'},
    ]

    static readonly wadFiles: WadFilesConf[] = [
        {flag: '🇨🇿', code: 'CZ', name: 'Czech', encoding: 'windows-1250'},
        {flag: '🇭🇺', code: 'HR', name: 'Hungarian', encoding: 'windows-1250'},
        {flag: '🇵🇹', code: 'PT', name: 'Portuguese', encoding: 'windows-1252'}, // TODO letter not found issue with ü (252) while bitmap font image has only 190 chars
        {flag: '🇷🇸', code: 'RS', name: 'Serbian', encoding: 'windows-1251'},
        {flag: '🇸🇮', code: 'SL', name: 'Slovenian', encoding: 'windows-1250'},
    ]

    // TODO Add OS font rendering and colors for Japanese and Korean

    readonly rootElement: HTMLElement
    readonly optionList: SelectFilesAccordion

    readonly zipFilesPanel: HTMLElement
    readonly zipFilesProgress: SelectFilesProgress = new SelectFilesProgress()
    readonly btnContainer: HTMLElement
    readonly buttons: HTMLButtonElement[] = []

    constructor(parent: HTMLElement, readonly onFilesLoaded: (vfs: VirtualFileSystem) => void) {
        this.rootElement = parent.appendChild(document.createElement('div'))
        this.rootElement.classList.add('select-files-modal')
        this.rootElement.style.visibility = 'hidden'
        const heading = this.rootElement.appendChild(document.createElement('h5'))
        heading.classList.add('select-files-heading')
        heading.innerText = 'Rock Raiders Web'
        const content = this.rootElement.appendChild(document.createElement('div'))
        content.classList.add('select-files-content')
        const hints = content.appendChild(document.createElement('div'))
        hints.appendChild(document.createElement('b')).innerText = 'Game resources not included!'
        hints.appendChild(document.createElement('div')).innerText = 'Select an option below to start:'
        this.optionList = new SelectFilesAccordion()
        content.appendChild(this.optionList.root)

        // Try to auto-start bundled game if available
        this.tryAutoStartBundledGame()

        this.zipFilesPanel = document.createElement('div')
        this.zipFilesProgress = new SelectFilesProgress()
        this.btnContainer = this.zipFilesPanel.appendChild(document.createElement('div'))
        this.btnContainer.classList.add('select-button-container')
        SelectFilesModal.zipPacks.forEach((f) => {
            const btn = this.btnContainer.appendChild(document.createElement('button'))
            this.buttons.push(btn)
            btn.innerText = f.flag
            btn.title = f.name
            btn.setAttribute('download-name', f.name)
            btn.addEventListener('click', async () => {
                try {
                    this.buttons.forEach((btn) => btn.disabled = true)
                    this.zipFilesPanel.replaceChildren(this.zipFilesProgress.root)
                    const buffers = await Promise.all([0, 1].map((n) => {
                        const url = `https://scarabol.github.io/wad-editor/mirror-archive.org/Rock%20Raiders%20%28${f.name}%29%20small.zip.part${n}`
                        const urlFileName = url.split('/').last()
                        if (!urlFileName) return new ArrayBuffer()
                        const fileName = decodeURIComponent(urlFileName)
                        this.zipFilesProgress.setProgress(fileName, 0, 100)
                        return SelectFilesModal.loadFileFromUrl(url, this.zipFilesProgress)
                    }))
                    const zipFileLength = buffers.reduce((prev, file) => prev + file.byteLength, 0)
                    const zipFileContent = new Uint8Array(zipFileLength)
                    let offset = 0
                    buffers.forEach((b) => {
                        zipFileContent.set(new Uint8Array(b), offset)
                        offset += b.byteLength
                    })
                    console.log('ZIP download complete')
                    const vfs = new VirtualFileSystem(f.encoding)
                    await new ZipFileParser(this.zipFilesProgress).readZipFile(vfs, zipFileContent)
                    this.onFilesLoaded(vfs)
                } finally {
                    this.buttons.forEach((btn) => btn.disabled = false)
                    this.zipFilesPanel.replaceChildren(this.btnContainer)
                    this.zipFilesProgress.reset()
                }
            })
        })
        const hintWadFiles = this.zipFilesPanel.appendChild(document.createElement('div'))
        hintWadFiles.innerHTML = 'Use WAD game files hosted on <a href="https://archive.org/details/lego-rr-0_20250425">archive.org</a> <b>(one-click-setup, no music/videos, no streamed voice lines)</b>:'
        hintWadFiles.style.padding = '10px 0'
        const wadContainer = this.zipFilesPanel.appendChild(document.createElement('div'))
        wadContainer.classList.add('select-button-container')
        SelectFilesModal.wadFiles.forEach((f) => {
            const btn = wadContainer.appendChild(document.createElement('button'))
            this.buttons.push(btn)
            btn.innerText = f.flag || f.code
            btn.title = f.name
            btn.setAttribute('download-name', f.name)
            btn.addEventListener('click', async () => {
                try {
                    this.buttons.forEach((btn) => btn.disabled = true)
                    this.zipFilesPanel.replaceChildren(this.zipFilesProgress.root)
                    const vfs = new VirtualFileSystem(f.encoding)
                    await Promise.all([0, 1].map(async (n) => {
                        const url = `https://scarabol.github.io/wad-editor/mirror-archive.org/${f.code}/RR${n}.wad`
                        const urlFileName = url.split('/').last()
                        if (!urlFileName) return
                        const fileName = decodeURIComponent(urlFileName)
                        this.zipFilesProgress.setProgress(fileName, 0, 100)
                        const buffer = await SelectFilesModal.loadFileFromUrl(url, this.zipFilesProgress)
                        const lFileName = fileName.toLowerCase()
                        vfs.registerFile(VirtualFile.fromBuffer(lFileName, buffer))
                        await cachePutData(lFileName, buffer)
                    }))
                    console.log('WAD download complete')
                    this.onFilesLoaded(vfs)
                } finally {
                    this.buttons.forEach((btn) => btn.disabled = false)
                    this.zipFilesPanel.replaceChildren(wadContainer)
                    this.zipFilesProgress.reset()
                }
            })
        })
        this.optionList.addOption('Use repacked game files hosted on <a href="https://archive.org/details/LEGORockRaiders-gamefiles-Eng">archive.org</a> <b>(one-click-setup, no music/videos)</b>:', this.zipFilesPanel)

        // Add bundled game option (for standalone app)
        this.addBundledGameOption()

        // Add extracted files option (for when you have extracted ISO and audio files)
        this.addExtractedFilesOption()

        const cueBinFilesPanel = document.createElement('div')
        const cueBinFilesProgress = new SelectFilesProgress()
        const cueBinFilesForm = new SelectFilesForm('Start with CUE/BIN files', ['Rock Raiders.cue', 'Rock Raiders.bin'], async (files: File[]) => {
            if (files.length !== 2) throw new Error(`Unexpected number of files (${files.length}) given`)
            try {
                cueBinFilesPanel.replaceChildren(cueBinFilesProgress.root)
                const cueFileBuffer = await files[0].arrayBuffer()
                const binFileBuffer = await files[1].arrayBuffer()
                const cueFile = await new CueFileParser(cueFileBuffer, binFileBuffer).parse()
                // Parse files from ISO image
                const isoFile = new IsoFileParser(cueFile.isoFile)
                const allFiles = await isoFile.loadAllFiles(cueBinFilesProgress)
                const vfs = new VirtualFileSystem() // TODO Set encoding when starting from CUE/BIN
                await Promise.all(allFiles.map(async (f) => {
                    if (f.fileName.equalsIgnoreCase('data1.hdr') || f.fileName.equalsIgnoreCase('data1.cab')) return // only cache unpacked files
                    await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                    vfs.registerFile(f)
                }))
                await Promise.all(cueFile.audioTracks.map(async (audioBuffer, c) => {
                    return await cachePutData(`musictrack${c}`, audioBuffer)
                }))
                this.onFilesLoaded(vfs)
            } finally {
                cueBinFilesPanel.replaceChildren(cueBinFilesForm.root)
                cueBinFilesProgress.reset()
            }
        })
        cueBinFilesPanel.appendChild(cueBinFilesForm.root)
        this.optionList.addOption('Use local CUE/BIN files, usually seen as CD image <b>(recommended, all features)</b>:', cueBinFilesPanel)
        const isoFilesPanel = document.createElement('div')
        const isoFilesProgress = new SelectFilesProgress()
        const isoFilesForm = new SelectFilesForm('Start with ISO file', ['Rock Raiders.iso'], async (files: File[]) => {
            if (files.length !== 1) throw new Error(`Unexpected number of files (${files.length}) given`)
            try {
                isoFilesPanel.replaceChildren(isoFilesProgress.root)
                const isoFileBuffer = await files[0].arrayBuffer()
                const isoFile = new IsoFileParser(isoFileBuffer)
                const allFiles = await isoFile.loadAllFiles(isoFilesProgress)
                const vfs = new VirtualFileSystem() // TODO Set encoding when starting from ISO
                await Promise.all(allFiles.map(async (f) => {
                    if (f.fileName.equalsIgnoreCase('data1.hdr') || f.fileName.equalsIgnoreCase('data1.cab')) return // only cache unpacked files
                    await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                    vfs.registerFile(f)
                }))
                this.onFilesLoaded(vfs)
            } finally {
                isoFilesPanel.replaceChildren(isoFilesForm.root)
                isoFilesProgress.reset()
            }
        })
        isoFilesPanel.appendChild(isoFilesForm.root)
        this.optionList.addOption('Use local ISO file, usually seen as CD image <b>(no music)</b>:', isoFilesPanel)
        const wadFilesForm = new SelectFilesForm('Start with WAD files', ['RR0.wad', 'RR1.wad'], async (files: File[]) => {
            if (files.length !== 2) throw new Error(`Unexpected number of files (${files.length}) given`)
            const vfs = new VirtualFileSystem() // TODO Set encoding when starting from WAD
            await Promise.all(files.map(async (file) => {
                const lFileName = file.name.toLowerCase()
                const buffer = await file.arrayBuffer()
                vfs.registerFile(VirtualFile.fromBuffer(lFileName, buffer))
                await cachePutData(lFileName, buffer)
            }))
            this.onFilesLoaded(vfs)
        })
        this.optionList.addOption('Use local WAD files, usually seen with mods:', wadFilesForm.root)
        const cabFilesPanel = document.createElement('div')
        const cabFilesProgress = new SelectFilesProgress()
        const cabFilesForm = new SelectFilesForm('Start with CAB files', ['data1.hdr', 'data1.cab'], async (files: File[]) => {
            if (files.length !== 2) throw new Error(`Unexpected number of files (${files.length}) given`)
            try {
                cabFilesPanel.replaceChildren(cabFilesProgress.root)
                const cabHeader = await files[0].arrayBuffer()
                const cabVolume = await files[1].arrayBuffer()
                console.time('Parsing CAB files')
                const cabFile = new CabFile(cabHeader, cabVolume).parse()
                console.timeEnd('Parsing CAB files')
                console.time('Unpack CAB files')
                const allFiles = await cabFile.loadAllFiles(cabFilesProgress)
                console.timeEnd('Unpack CAB files')
                const vfs = new VirtualFileSystem() // TODO Set encoding when starting from CAB
                await Promise.all(allFiles.map(async (f) => {
                    await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                    vfs.registerFile(f)
                }))
                this.onFilesLoaded(vfs)
            } finally {
                cabFilesPanel.replaceChildren(cabFilesForm.root)
                cabFilesProgress.reset()
            }
        })
        cabFilesPanel.appendChild(cabFilesForm.root)
        this.optionList.addOption('Use local CAB files, usually seen on CD with installer:', cabFilesPanel)
    }

    private addBundledGameOption() {
        const bundledGamePanel = document.createElement('div')
        const bundledGameProgress = new SelectFilesProgress()

        // Create a button to load bundled game
        const loadButton = document.createElement('button')
        loadButton.innerText = '🎮 Load Bundled Game'
        loadButton.style.cssText = `
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `

        loadButton.addEventListener('mouseenter', () => {
            loadButton.style.transform = 'translateY(-2px)'
            loadButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)'
        })

        loadButton.addEventListener('mouseleave', () => {
            loadButton.style.transform = 'translateY(0)'
            loadButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
        })

        loadButton.addEventListener('click', async () => {
            try {
                bundledGamePanel.replaceChildren(bundledGameProgress.root)
                const vfs = await BundledGameLoader.loadBundledGame(bundledGameProgress)
                this.onFilesLoaded(vfs)
            } catch (error) {
                console.error('Failed to load bundled game:', error)
                bundledGamePanel.replaceChildren(loadButton)
                // Show error message
                const errorDiv = document.createElement('div')
                errorDiv.style.cssText = 'color: red; margin-top: 10px; text-align: center;'
                const errorMessage = error instanceof Error ? error.message : String(error)
                errorDiv.innerText = `Error: ${errorMessage}`
                bundledGamePanel.appendChild(errorDiv)
            }
        })

        bundledGamePanel.appendChild(loadButton)

        // Add this as the first option
        this.optionList.addOption('🎮 <b>Bundled Game (Recommended for Standalone App)</b>', bundledGamePanel)
    }

    private addExtractedFilesOption() {
        const extractedFilesPanel = document.createElement('div')
        const extractedFilesProgress = new SelectFilesProgress()
        const extractedFilesForm = new SelectFilesForm('Start with extracted files (data1.hdr, data1.cab, audio tracks)', ['data1.hdr', 'data1.cab', 'out02.cdr', 'out03.cdr', 'out04.cdr'], async (files: File[]) => {
            if (files.length !== 5) throw new Error(`Unexpected number of files (${files.length}) given. Expected 5 files: data1.hdr, data1.cab, and 3 audio tracks.`)
            try {
                extractedFilesPanel.replaceChildren(extractedFilesProgress.root)
                const hdrBuffer = await files[0].arrayBuffer()
                const cabBuffer = await files[1].arrayBuffer()

                extractedFilesProgress.setProgress('Parsing CAB files...', 40, 100)
                const cabFile = new CabFile(hdrBuffer, cabBuffer).parse()

                extractedFilesProgress.setProgress('Loading all files from CAB...', 60, 100)
                const allFiles = await cabFile.loadAllFiles(extractedFilesProgress)

                extractedFilesProgress.setProgress('Loading audio tracks...', 80, 100)
                // Load the audio tracks from the selected files
                await this.loadAudioTracksFromFiles(files.slice(2)) // Skip hdr and cab files

                extractedFilesProgress.setProgress('Setting up virtual file system...', 90, 100)
                const vfs = new VirtualFileSystem()

                // Register all files from the CAB
                await Promise.all(allFiles.map(async (f) => {
                    await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                    vfs.registerFile(f)
                }))

                extractedFilesProgress.setProgress('Game loaded successfully!', 100, 100)
                this.onFilesLoaded(vfs)
            } finally {
                extractedFilesPanel.replaceChildren(extractedFilesForm.root)
                extractedFilesProgress.reset()
            }
        })
        extractedFilesPanel.appendChild(extractedFilesForm.root)
        this.optionList.addOption('Start with extracted files (data1.hdr, data1.cab, out02.cdr, out03.cdr, out04.cdr) <b>(includes all audio tracks)</b>:', extractedFilesPanel)
    }

    /**
     * Loads audio tracks from manually selected CDR files
     */
    private async loadAudioTracksFromFiles(audioFiles: File[]): Promise<void> {
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i]
            try {
                console.log(`🔄 Loading audio track ${i + 1}: ${file.name}`)
                const rawAudioBuffer = await file.arrayBuffer()
                console.log(`📥 Raw audio data loaded: ${rawAudioBuffer.byteLength} bytes`)

                // Convert raw CD audio data to WAV format
                const wavBuffer = this.convertCdrToWav(rawAudioBuffer)
                console.log(`🎼 Converted to WAV format: ${wavBuffer.byteLength} bytes`)

                // Audio tracks are indexed from 0 in the audioTracks array
                const musicTrackName = `musictrack${i}`
                await cachePutData(musicTrackName, wavBuffer)
                console.log(`✅ Successfully registered ${musicTrackName} (${wavBuffer.byteLength} bytes WAV)`)

                // Verify the track was cached
                const cachedTrack = await cacheGetData(musicTrackName)
                if (cachedTrack) {
                    console.log(`✅ Verified ${musicTrackName} is in cache: ${cachedTrack.byteLength} bytes`)
                } else {
                    console.error(`❌ Failed to verify ${musicTrackName} in cache`)
                }

            } catch (error) {
                console.error(`❌ Could not load audio track ${file.name}:`, error)
                // Continue loading other tracks even if some fail
            }
        }
    }

    /**
     * Converts raw CD audio data (CDR) to WAV format
     * This replicates the functionality of the CUE/BIN parser's readAudioEntry method
     */
    private convertCdrToWav(rawAudioBuffer: ArrayBuffer): ArrayBuffer {
        const headerLen = 44
        const rawDataLength = rawAudioBuffer.byteLength
        const wavBuffer = new ArrayBuffer(headerLen + rawDataLength)
        const wavArray = new Uint8Array(wavBuffer)
        const wavView = new DataView(wavBuffer)

        // Write WAV header
        const encoder = new TextEncoder()
        wavArray.set(encoder.encode('RIFF'), 0) // RIFF header
        wavView.setUint32(4, rawDataLength + 8 + 24 + 4, true) // length of file, starting from WAVE
        wavArray.set(encoder.encode('WAVE'), 8)
        wavArray.set(encoder.encode('fmt '), 12) // FORMAT header
        wavView.setUint32(16, 16, true) // length of FORMAT header
        wavView.setUint16(20, 1, true) // constant
        wavView.setUint16(22, 2, true) // channels (stereo)
        wavView.setUint32(24, 44100, true) // sample rate (44.1 kHz)
        wavView.setUint32(28, 44100 * 4, true) // bytes per second
        wavView.setUint16(32, 4, true) // bytes per sample
        wavView.setUint16(34, 16, true) // bits per channel
        wavArray.set(encoder.encode('data'), 36) // DATA header
        wavView.setUint32(40, rawDataLength, true)

        // Copy the raw audio data after the header
        wavArray.set(new Uint8Array(rawAudioBuffer), headerLen)

        return wavBuffer
    }

    private async tryAutoStartBundledGame() {
        // Wait a bit for everything to load
        setTimeout(async () => {
            try {
                // Check if we're in a standalone app environment
                if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
                    console.log('Attempting to auto-start bundled game...')
                    const vfs = await BundledGameLoader.loadBundledGame(this.zipFilesProgress)
                    this.onFilesLoaded(vfs)
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.log('Auto-start failed, showing manual options:', errorMessage)
                // Auto-start failed, show the modal normally
            }
        }, 1000)
    }

    static async loadFileFromUrl(url: string, progress: SelectFilesProgress): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const urlFileName = url.split('/').last()
            if (!urlFileName) {
                reject(new Error('No file name given'))
                return
            }
            const fileName = decodeURIComponent(urlFileName)
            console.log(`Loading file from ${url}`)
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url)
            xhr.responseType = 'arraybuffer'
            xhr.onprogress = (event) => progress.setProgress(fileName, event.loaded, event.total)
            xhr.onerror = (event) => reject(event)
            xhr.onload = () => {
                if (xhr.status !== 200) {
                    reject(new Error(`Could not fetch file from "${url}"! Got status ${xhr.status} - ${xhr.statusText}`))
                } else if (!xhr.response) {
                    reject(new Error(`No response content for request received, please restart browser`))
                } else {
                    resolve(xhr.response)
                }
            }
            xhr.send()
        })
    }

    show(): void {
        this.rootElement.style.visibility = 'visible'
    }

    hide(): void {
        this.rootElement.style.visibility = 'hidden'
    }
}
