const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth');
const {
  obtenerUsuarios, obtenerUsuarioPorId, crearUsuario,
  modificarUsuario, darDeBaja, darDeAlta, eliminarUsuario
} = require('../controllers/usuariosController');

router.get('/', verificarToken, verificarRol('administrador', 'administrativo'), obtenerUsuarios);
router.get('/:id', verificarToken, verificarRol('administrador', 'administrativo'), obtenerUsuarioPorId);
router.post('/', verificarToken, verificarRol('administrador', 'administrativo'), crearUsuario);
router.put('/:id', verificarToken, verificarRol('administrador', 'administrativo'), modificarUsuario);
router.patch('/:id/baja', verificarToken, verificarRol('administrador', 'administrativo'), darDeBaja);
router.patch('/:id/alta', verificarToken, verificarRol('administrador', 'administrativo'), darDeAlta);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminarUsuario);

module.exports = router;