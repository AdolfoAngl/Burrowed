import express from 'express';
const router = express.Router();
import Material from '../models/Material.js';

// Endpoint para obtener materiales por laboratorio (AJAX)
router.get('/materiales-por-laboratorio/:labId', async (req, res) => {
  try {
    const materiales = await Material.findAll({ where: { laboratorioId: req.params.labId } });
    res.json(materiales);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener materiales' });
  }
});

export default router;
