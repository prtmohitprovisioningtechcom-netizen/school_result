const fs = require('fs');
const filePath = 'server/controllers/settingsController.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Update getSettings (usually simple select *)
// Update updateSettings
content = content.replace(
  `exam_types = data.exam_types || settings[0].exam_types`,
  `exam_types = data.exam_types || settings[0].exam_types,
           results_published = data.results_published !== undefined ? data.results_published : settings[0].results_published`
);

content = content.replace(
  `[data.school_name || settings[0].school_name, data.address || settings[0].address, data.phone || settings[0].phone, data.email || settings[0].email, data.website || settings[0].website, logoUrl, signatureUrl, data.exam_types || settings[0].exam_types]`,
  `[data.school_name || settings[0].school_name, data.address || settings[0].address, data.phone || settings[0].phone, data.email || settings[0].email, data.website || settings[0].website, logoUrl, signatureUrl, data.exam_types || settings[0].exam_types, data.results_published !== undefined ? data.results_published : settings[0].results_published]`
);

fs.writeFileSync(filePath, content);
console.log('settingsController.ts updated');
