const express = require('express');
const { getPaymentConfig, createPaymentIntent, createVenmoOrder, captureVenmoOrder, createZelleOrder, claimZellePayment } = require('../controllers/payment.controller');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

router.get('/payment-config', getPaymentConfig);

router.post('/create-payment-intent', optionalAuth, createPaymentIntent);
router.post('/create-venmo-order', optionalAuth, createVenmoOrder);
router.post('/create-zelle-order', optionalAuth, createZelleOrder);
router.post('/capture-venmo-order', optionalAuth, captureVenmoOrder);
router.post('/claim-zelle-payment', optionalAuth, claimZellePayment);

module.exports = router;
