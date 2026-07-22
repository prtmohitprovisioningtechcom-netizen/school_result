const fs = require('fs');
const filePath = 'app/admin/layout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for school settings
content = content.replace(
  `  const [darkMode, setDarkMode] = useState(false);`,
  `  const [darkMode, setDarkMode] = useState(false);\n  const [schoolSettings, setSchoolSettings] = useState<any>(null);`
);

// 2. Fetch settings in useEffect
content = content.replace(
  `    if (document.documentElement.classList.contains('dark')) {`,
  `    // Fetch settings
    fetch('/api/settings', { headers: { Authorization: \`Bearer \${token}\` } })
      .then(res => res.json())
      .then(data => setSchoolSettings(data))
      .catch(err => console.error("Error fetching settings:", err));

    if (document.documentElement.classList.contains('dark')) {`
);

// 3. Replace Logo & Name
content = content.replace(
  `<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              School ERP
            </span>`,
  `{schoolSettings?.logo_url ? (
              <img src={schoolSettings.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover bg-white" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 truncate max-w-[180px]" title={schoolSettings?.school_name || "School ERP"}>
              {schoolSettings?.school_name || "School ERP"}
            </span>`
);

fs.writeFileSync(filePath, content);
console.log('Layout updated.');
