const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth');
const { obtenerDepartamentos, crearDepartamento, editarDepartamento, eliminarDepartamento } = require('../controllers/departamentosController');

router.get('/', verificarToken, obtenerDepartamentos);
router.post('/', verificarToken, verificarRol('administrador', 'administrativo'), crearDepartamento);
router.put('/:id', verificarToken, verificarRol('administrador', 'administrativo'), editarDepartamento);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarDepartamento);

module.exports = router;