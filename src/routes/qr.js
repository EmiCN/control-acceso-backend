const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { generarQR, validarQR, obtenerHistorial } = require('../controllers/qrController');
const { generarQR, validarQR, obtenerHistorial, obtenerQRUsuario } = require('../controllers/qrController');

router.get('/generar', verificarToken, verificarRol('empleado', 'administrativo', 'administrador', 'policia'), generarQR);
router.post('/validar', verificarToken, verificarRol('policia', 'administrador'), validarQR);
router.get('/historial', verificarToken, verificarRol('administrador', 'administrativo'), obtenerHistorial);
router.get('/usuario/:id', verificarToken, verificarRol('administrador', 'administrativo'), obtenerQRUsuario);

module.exports = router;