const { addonBuilder } = require('stremio-addon-sdk');

const manifest = {
    id: "org.stremio.addon.manager",
    version: "1.0.0",
    name: "Addon Manager",
    description: "Reorder your installed Stremio addons via drag-and-drop UI",
    resources: [],
    types: [],
    idPrefixes: [],
    catalogs: [],
    behaviorHints: {
        configurationRequired: true
    }
};

const builder = new addonBuilder(manifest);

module.exports = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(manifest);
};
