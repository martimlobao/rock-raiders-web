import { VirtualFileSystem } from '../fileparser/VirtualFileSystem'
import { CabFile } from '../fileparser/CabFile'
import { SelectFilesProgress } from './SelectFilesProgress'
import { cachePutData } from '../AssetCacheHelper'
import { VirtualFile } from '../fileparser/VirtualFile'

export class ExtractedFilesLoader {
    /**
     * Loads the extracted game data directly from the extracted ISO files
     * This bypasses the need for CUE/BIN parsing by loading the already-extracted files
     */
    static async loadExtractedGame(progress: SelectFilesProgress): Promise<VirtualFileSystem> {
        console.log('🎮 Starting extracted game loading...');

        try {
            progress.setProgress('Loading extracted game data...', 0, 100)

            // Load the extracted CAB files (data1.hdr and data1.cab)
            progress.setProgress('Loading CAB header file...', 20, 100)
            const cabHeaderBuffer = await this.loadBundledFileWithRetry('data1.hdr', 3)

            progress.setProgress('Loading CAB volume file...', 40, 100)
            const cabVolumeBuffer = await this.loadBundledFileWithRetry('data1.cab', 3)

            // Load the extracted ISO files (the actual game files)
            progress.setProgress('Loading extracted ISO files...', 60, 100)
            const isoFiles = await this.loadExtractedIsoFiles(progress)

            progress.setProgress('Parsing CAB files...', 70, 100)
            const cabFile = new CabFile(cabHeaderBuffer, cabVolumeBuffer).parse()

            progress.setProgress('Loading all files from CAB...', 80, 100)
            const cabFiles = await cabFile.loadAllFiles(progress)

            progress.setProgress('Setting up virtual file system...', 90, 100)
            const vfs = new VirtualFileSystem()

            // Register all extracted files from the ISO
            await Promise.all(isoFiles.map(async (f) => {
                await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                vfs.registerFile(f)
            }))

            // Register all files from the CAB
            await Promise.all(cabFiles.map(async (f) => {
                await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                vfs.registerFile(f)
            }))

            // Load and register audio tracks
            progress.setProgress('Loading audio tracks...', 95, 100)
            await this.loadAudioTracks(vfs)

            progress.setProgress('Game loaded successfully!', 100, 100)
            console.log('🎉 Extracted game loaded successfully!');
            return vfs

        } catch (error: unknown) {
            console.error('❌ Failed to load extracted game:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to load extracted game: ${errorMessage}`)
        }
    }

    /**
     * Loads the extracted ISO files that contain the game data
     */
    private static async loadExtractedIsoFiles(progress: SelectFilesProgress): Promise<VirtualFile[]> {
        const isoFiles: VirtualFile[] = []

        // List of files that should be extracted from the ISO
        // These are typically the files that are directly accessible without CAB extraction
        const isoFileNames = [
            'autorun.inf',
            'setup.exe',
            'setup.ini',
            'readme.txt',
            'license.txt'
            // Add more files as needed based on what's actually in your extracted ISO
        ]

        for (let i = 0; i < isoFileNames.length; i++) {
            const fileName = isoFileNames[i]
            try {
                progress.setProgress(`Loading ${fileName}...`, 60 + (i * 5), 80)
                const buffer = await this.loadBundledFileWithRetry(fileName, 1)
                isoFiles.push(VirtualFile.fromBuffer(fileName, buffer))
            } catch (error) {
                console.warn(`⚠️ Could not load ${fileName}, skipping:`, error)
                // Continue loading other files even if some fail
            }
        }

        return isoFiles
    }

    /**
     * Loads the audio tracks from the extracted CDR files
     */
    private static async loadAudioTracks(vfs: VirtualFileSystem): Promise<void> {
        // Load the extracted audio tracks (out02.cdr, out03.cdr, out04.cdr)
        const audioTrackNames = ['out02.cdr', 'out03.cdr', 'out04.cdr']

        for (let i = 0; i < audioTrackNames.length; i++) {
            const trackName = audioTrackNames[i]
            try {
                const audioBuffer = await this.loadBundledFileWithRetry(trackName, 1)
                await cachePutData(`musictrack${i}`, audioBuffer)
                console.log(`✅ Loaded audio track ${i + 1}: ${trackName}`)
            } catch (error) {
                console.warn(`⚠️ Could not load audio track ${trackName}, skipping:`, error)
                // Continue loading other tracks even if some fail
            }
        }
    }

    /**
     * Loads a bundled file from the app's assets with retry logic
     */
    private static async loadBundledFileWithRetry(filename: string, maxRetries: number): Promise<ArrayBuffer> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries} to load ${filename}`);
                return await this.loadBundledFile(filename);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error; // Last attempt failed
                }

                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️ Attempt ${attempt} failed for ${filename}: ${errorMessage}`);
                console.log(`⏳ Waiting before retry...`);

                // Wait longer between retries
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        throw new Error(`Failed to load ${filename} after ${maxRetries} attempts`);
    }

    /**
     * Loads a bundled file from the app's assets
     * In Electron, these files are bundled with the app
     */
    private static async loadBundledFile(filename: string): Promise<ArrayBuffer> {
        console.log(`🔄 Attempting to load bundled file: ${filename}`);

        try {
            // Try to load from the bundled protocol (Electron app)
            try {
                console.log(`🌐 Trying bundled protocol: bundled://${filename}`);
                const response = await fetch(`bundled://${filename}`);
                if (response.ok) {
                    const data = await response.arrayBuffer();
                    console.log(`✅ Successfully loaded ${filename} from bundled protocol (${data.byteLength} bytes)`);
                    return data;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (protocolError) {
                console.warn(`⚠️ Bundled protocol failed for ${filename}:`, protocolError);

                // Fallback: try to load from the bundled assets directory (web version)
                try {
                    console.log(`🌐 Trying web fallback: ./bundled/${filename}`);
                    const response = await fetch(`./bundled/${filename}`);
                    if (response.ok) {
                        const data = await response.arrayBuffer();
                        console.log(`✅ Successfully loaded ${filename} from web fallback (${data.byteLength} bytes)`);
                        return data;
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (fallbackError) {
                    console.warn(`⚠️ Web fallback failed for ${filename}:`, fallbackError);

                    // Final fallback: try to load from the root assets directory
                    try {
                        console.log(`🌐 Trying final fallback: ./assets/${filename}`);
                        const response = await fetch(`./assets/${filename}`);
                        if (response.ok) {
                            const data = await response.arrayBuffer();
                            console.log(`✅ Successfully loaded ${filename} from assets fallback (${data.byteLength} bytes)`);
                            return data;
                        } else {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                    } catch (finalError) {
                        const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                        throw new Error(`Could not load bundled file ${filename}: ${errorMessage}`);
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to load bundled file ${filename}:`, errorMessage);
            throw new Error(`Could not load bundled file ${filename}: ${errorMessage}`);
        }
    }
}
