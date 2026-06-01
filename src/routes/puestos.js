const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { obtenerPuestos, crearPuesto, editarPuesto, eliminarPuesto } = require('../controllers/puestosController');

router.get('/', verificarToken, obtenerPuestos);
router.post('/', verificarToken, verificarRol('administrador', 'administrativo'), crearPuesto);
router.put('/:id', verificarToken, verificarRol('administrador', 'administrativo'), editarPuesto);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarPuesto);

module.exports = router;