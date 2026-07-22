const fs = require('fs');
const filePath = 'server/controllers/resultController.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add query to fetch settings
content = content.replace(
  `export const downloadAdmitCards = async (req: Request, res: Response) => {
  try {`,
  `export const downloadAdmitCards = async (req: Request, res: Response) => {
  try {
    const settingsArr: any = await query('SELECT * FROM school_settings LIMIT 1');
    const settings = settingsArr[0] || { school_name: 'School ERP' };
`
);

content = content.replace(
  `export const downloadMarksheets = async (req: Request, res: Response) => {
  try {`,
  `export const downloadMarksheets = async (req: Request, res: Response) => {
  try {
    const settingsArr: any = await query('SELECT * FROM school_settings LIMIT 1');
    const settings = settingsArr[0] || { school_name: 'School ERP' };
`
);

// Inject settings into HTML string in downloadAdmitCards
content = content.replace(
  /\<h1 style="margin: 0; font-size: 24px; color: #1e40af;"\>School ERP\<\/h1\>/g,
  `<div style="display: flex; align-items: center; justify-content: center; gap: 15px;">\${settings.logo_url ? \`<img src="http://localhost:3000\${settings.logo_url}" style="height: 50px; width: 50px; object-fit: contain;" />\` : ''}<h1 style="margin: 0; font-size: 24px; color: #1e40af;">\${settings.school_name || 'School ERP'}</h1></div>`
);

// Address replace in admit cards
content = content.replace(
  /\<p style="margin: 5px 0 0; color: #64748b; font-size: 14px;"\>Your School Address, City, State - ZIP\<\/p\>/g,
  `<p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">\${settings.address || 'School Address'} \${settings.phone ? ' | Ph: ' + settings.phone : ''}</p>`
);

// Replace "Principal Sign" string in admit cards to use signature if available
content = content.replace(
  /\<div style="border-top: 1px solid #000; padding-top: 5px;"\>Principal Sign\<\/div\>/g,
  `\${settings.principal_signature_url ? \`<img src="http://localhost:3000\${settings.principal_signature_url}" style="height: 40px; margin-bottom: 5px;" /><br/>\` : ''}<div style="border-top: 1px solid #000; padding-top: 5px;">Principal Sign</div>`
);

// In downloadMarksheets - front page Header
content = content.replace(
  /\<h1 style="margin: 0; font-size: 32px; color: #1e3a8a; text-shadow: 1px 1px 2px rgba\(0,0,0,0\.1\);"\>School ERP\<\/h1\>/g,
  `<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">\${settings.logo_url ? \`<img src="http://localhost:3000\${settings.logo_url}" style="height: 60px; width: 60px; object-fit: contain;" />\` : ''}<h1 style="margin: 0; font-size: 32px; color: #1e3a8a; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">\${settings.school_name || 'School ERP'}</h1></div>`
);

// In downloadMarksheets - front page Address
content = content.replace(
  /\<p style="margin: 5px 0; font-size: 16px; color: #475569;"\>Your City, State - ZIP Code \| Phone: \+91 9876543210\<\/p\>/g,
  `<p style="margin: 5px 0; font-size: 16px; color: #475569;">\${settings.address || 'Address'} \${settings.phone ? '| Phone: ' + settings.phone : ''}</p>`
);

// In downloadMarksheets - back page signatures
content = content.replace(
  /\<td style="border:none; text-align: left;"\>\<strong\>Principal Sign\.\<\/strong\>\<\/td\>/g,
  `<td style="border:none; text-align: left;">\${settings.principal_signature_url ? \`<img src="http://localhost:3000\${settings.principal_signature_url}" style="height: 40px; margin-bottom: 5px; display: block;" />\` : ''}<strong>Principal Sign.</strong></td>`
);

fs.writeFileSync(filePath, content);
console.log('Result controller updated.');
