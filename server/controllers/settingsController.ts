import { Request, Response } from 'express';
import { query, execute } from '../utils/dbHelper';

export const getPublicBranding = async (req: Request, res: Response) => {
  try {
    const settings: any = await query(
      `SELECT school_name, address, phone, email, website, logo_url
       FROM school_settings LIMIT 1`
    );
    res.json(settings[0] || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching school branding' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await query('SELECT * FROM school_settings LIMIT 1');
    res.json(settings[0] || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching school settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { school_name, address, phone, email, website, exam_types, results_published } = req.body;
    const typesValue = exam_types || 'Half-Yearly, Annual';
    
    // Check if exists
    const settings: any = await query('SELECT id, results_published FROM school_settings LIMIT 1');
    
    // Handle logo and signature if uploaded via multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let logo_url = null;
    let signature_url = null;
    
    if (files && files['logo']) logo_url = `/uploads/${files['logo'][0].filename}`;
    if (files && files['signature']) signature_url = `/uploads/${files['signature'][0].filename}`;

    if (settings.length > 0) {
      let sql = 'UPDATE school_settings SET school_name=?, address=?, phone=?, email=?, website=?, exam_types=?, results_published=?';
      const rp = results_published !== undefined ? Number(results_published) : settings[0].results_published;
      const params = [school_name, address, phone, email, website, typesValue, rp];
      
      if (logo_url) { sql += ', logo_url=?'; params.push(logo_url); }
      if (signature_url) { sql += ', principal_signature_url=?'; params.push(signature_url); }
      
      sql += ' WHERE id = ?';
      params.push(settings[0].id);
      
      await execute(sql, params);
    } else {
      const rp = results_published !== undefined ? Number(results_published) : 0;
      await execute(
        `INSERT INTO school_settings (school_name, address, phone, email, website, exam_types, results_published, logo_url, principal_signature_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [school_name, address, phone, email, website, typesValue, rp, logo_url, signature_url]
      );
    }

    // Keep exam_types table in sync with settings list
    for (const name of String(typesValue).split(',').map((t) => t.trim()).filter(Boolean)) {
      await execute('INSERT IGNORE INTO exam_types (name) VALUES (?)', [name]);
    }
    
    res.json({ message: 'School settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating settings' });
  }
};
