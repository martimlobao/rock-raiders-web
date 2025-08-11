import { VirtualFileSystem } from '../fileparser/VirtualFileSystem'
import { CueFileParser } from '../fileparser/CueFileParser'
import { IsoFileParser } from '../fileparser/IsoFileParser'
import { SelectFilesProgress } from './SelectFilesProgress'
import { cachePutData } from '../AssetCacheHelper'

// Declare the global env object
declare global {
  interface Window {
    env?: {
      platform: string;
      bundledServerPort: number | null;
    };
  }
}

export class BundledGameLoader {
    /**
     * Loads the bundled game data automatically
     * This is used in the standalone Electron app to load game files without user interaction
     */
                static async loadBundledGame(progress: SelectFilesProgress): Promise<VirtualFileSystem> {
        console.log('🎮 Starting bundled game loading...');

        try {
            progress.setProgress('Loading bundled game data...', 0, 100)

            // Load bundled CUE and BIN files with retry
            progress.setProgress('Loading CUE file...', 10, 100)
            const cueFileBuffer = await this.loadBundledFileWithRetry('ROCKRAIDERS.cue', 3)

            progress.setProgress('Loading BIN file...', 20, 100)
            const binFileBuffer = await this.loadBundledFileWithRetry('ROCKRAIDERS.bin', 3)

            progress.setProgress('Parsing CUE/BIN files...', 30, 100)
            const cueFile = await new CueFileParser(cueFileBuffer, binFileBuffer).parse()

            progress.setProgress('Extracting ISO data...', 50, 100)
            const isoFile = new IsoFileParser(cueFile.isoFile)
            const allFiles = await isoFile.loadAllFiles(progress)

            progress.setProgress('Setting up virtual file system...', 80, 100)
            const vfs = new VirtualFileSystem()

            // Register all extracted files
            await Promise.all(allFiles.map(async (f) => {
                if (f.fileName.equalsIgnoreCase('data1.hdr') || f.fileName.equalsIgnoreCase('data1.cab')) return
                await cachePutData(f.fileName.toLowerCase(), f.toBuffer())
                vfs.registerFile(f)
            }))

            // Register audio tracks
            await Promise.all(cueFile.audioTracks.map(async (audioBuffer, c) => {
                return await cachePutData(`musictrack${c}`, audioBuffer)
            }))

            progress.setProgress('Game loaded successfully!', 100, 100)
            console.log('🎉 Bundled game loaded successfully!');
            return vfs

        } catch (error: unknown) {
            console.error('❌ Failed to load bundled game:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to load bundled game: ${errorMessage}`)
        }
    }

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
