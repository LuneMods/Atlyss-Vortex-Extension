const path = require('path');
const fs = require('fs-extra');
const { util, log } = require('vortex-api');

// Game-specific constants
const GAME_ID = 'atlyss';
const STEAMAPP_ID = '2768430';
const MOD_FILE_EXT = ""; //Blank as BepInEx can use a variety of files to load textures, models or animations

/**
 * Main entry point for the extension
 * @param {object} context - Vortex extension context
 * @returns {boolean}
 */

function main(context) {
    context.registerGame({
        id: GAME_ID,
        name: 'atlyss',
        mergeMods: true,
        queryPath: findGame,
        supportedTools: [],
        queryModPath: () => '',
        logo: 'gameart.jpg',
        executable: () => 'ATLYSS.exe',
        requiredFiles: ['ATLYSS.exe'],
        setup: prepareForModding,
        environment: {
            SteamAPPId: STEAMAPP_ID,
        },
        details: {
            steamAppId: STEAMAPP_ID,
        },
    });

    // Register the mod installer
    context.registerInstaller('atlyss-mod', 25, testSupportedContent, installContent);

    log('ATLYSS extension loaded successfully.');
    return true;
}

/**
 * Locate the game installation folder
 * @returns {Promise<string>}
 */
function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
        .then(game => game.gamePath)
        .catch(() => {
            throw new Error('Unable to locate ATLYSS installation.');
        });
}

/**
 * Prepare the game directory for modding, including copying all dependencies
 * @param {object} discovery - Game discovery information
 * @returns {Promise<void>}
 */
function prepareForModding(discovery) {
    const gameDir = discovery.path;
    const dependenciesDir = path.join(__dirname, 'Dependencies'); // Directory containing dependencies

    // Ensure the Mods folder exists
    const pluginsDirectory = path.join(gameDir, 'BepInEx/plugins');
    return fs.ensureDir(pluginsDirectory)
        .then(() => fs.readdir(dependenciesDir))
        .then(files => Promise.all(files.map(file => {
            const src = path.join(dependenciesDir, file);
            const dest = path.join(gameDir, file);

            return fs.copy(src, dest, { overwrite: true })
                .then(() => log(`Copied dependency: ${file}`))
                .catch(err => {
                    log(`Error copying ${file}: ${err.message}`, 'error');
                    throw new Error(`Failed to copy dependency: ${file}`);
                });
        })))
        .then(() => log('All dependencies installed successfully.'));
}


/**
 * Check if the mod archive contains supported content
 * @param {string[]} files - List of files in the mod archive
 * @param {string} gameId - ID of the game
 * @returns {Promise<{supported: boolean, requiredFiles: string[]}>}
 */
function testSupportedContent(files, gameId) {
    const supported = (gameId === GAME_ID) &&
        files.some(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);

    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

function installContent(files) {
    const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);
    
    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file => 
      ((file.indexOf(rootPath) !== -1) 
      && (!file.endsWith(path.sep))));
  
    const instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
  
    return Promise.resolve({ instructions });
  }

module.exports = {
    default: main,
};
