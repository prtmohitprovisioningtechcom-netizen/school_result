const fs = require('fs');
const filePath = 'app/admin/settings/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update initial state
content = content.replace(
  `exam_types: ''`,
  `exam_types: '',\n    results_published: false`
);

// 2. Update fetchSettings
content = content.replace(
  `exam_types: data.exam_types || 'Half-Yearly, Annual'`,
  `exam_types: data.exam_types || 'Half-Yearly, Annual',\n          results_published: data.results_published == 1`
);

// 3. Update handleSave
content = content.replace(
  `formData.append('exam_types', settings.exam_types);`,
  `formData.append('exam_types', settings.exam_types);\n      formData.append('results_published', settings.results_published ? "1" : "0");`
);

// 4. Update UI
const uiAddition = `
            <div className="sm:col-span-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Publish Marksheets Globally</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">If enabled, teachers and students will be able to download their marksheets. If disabled, only Admins can view them.</p>
                </div>
                <div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.results_published}
                      onChange={(e) => setSettings({...settings, results_published: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
`;

content = content.replace(
  `<div className="sm:col-span-6">
               <div className="sm:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exam Types</label>`,
  `${uiAddition}\n            <div className="sm:col-span-6">\n               <div className="sm:col-span-2">\n                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Exam Types</label>`
);

fs.writeFileSync(filePath, content);
console.log('Settings Page updated');
