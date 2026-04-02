/**
 * api/manifest.js
 * Vercel serverless function — serves the Stremio addon manifest.
 */

const { setSecurityHeaders } = require('../lib/securityHeaders');

module.exports = (req, res) => {
  setSecurityHeaders(res);

  const manifest = {
    id:          'community.addon-manager',
    version:     '1.0.0',
    name:        'Addon Manager',
    description: 'Reorder, enable/disable, and organize your installed Stremio addons with a drag-and-drop interface. Requires your Stremio auth key for cloud sync.',

    resources: ['catalog'],
    types:     ['other'],
    catalogs:  [],

    behaviorHints: {
      configurable:          true,
      configurationRequired: false,
    },

    // Stremio opens this URL when the user clicks ⚙ Configure
    config: [
      {
        key:      'note',
        type:     'text',
        title:    'Click Configure to open the Addon Manager.',
        required: false,
      },
    ],
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(manifest);
};
