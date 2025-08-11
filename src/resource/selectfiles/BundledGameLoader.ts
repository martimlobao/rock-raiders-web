import { VirtualFileSystem } from '../fileparser/VirtualFileSystem'
import { ExtractedFilesLoader } from './ExtractedFilesLoader'
import { SelectFilesProgress } from './SelectFilesProgress'

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
     * Now uses extracted files instead of CUE/BIN files
     */
    static async loadBundledGame(progress: SelectFilesProgress): Promise<VirtualFileSystem> {
        console.log('🎮 Starting bundled game loading...');

        try {
            progress.setProgress('Loading bundled game data...', 0, 100)

            // Use the new ExtractedFilesLoader to load the extracted files directly
            progress.setProgress('Loading extracted game files...', 10, 100)
            const vfs = await ExtractedFilesLoader.loadExtractedGame(progress)

            progress.setProgress('Game loaded successfully!', 100, 100)
            console.log('🎉 Bundled game loaded successfully!');
            return vfs

        } catch (error: unknown) {
            console.error('❌ Failed to load bundled game:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to load bundled game: ${errorMessage}`)
        }
    }
}
