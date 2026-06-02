const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

router.get('/callback', albumController.handleCallback);
router.get('/logout', albumController.logout);
router.post('/refresh', albumController.refresh);
router.get('/', albumController.handleFilter);
router.get('/shuffle', albumController.handleShuffle);
router.get('/genres', albumController.getGenres);
router.get('/export/csv', albumController.exportCsv);
router.get('/export/csv/filtered', albumController.exportFilteredCsv);
router.get('/export/json', albumController.exportJson);
router.get('/export/json/filtered', albumController.exportFilteredJson);
router.get('/full', albumController.handleFull);
module.exports = router;