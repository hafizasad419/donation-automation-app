import { Router } from 'express';
import { sendDonationConfirmationToDonor } from '../controller/sheet.controller.js';

const router = Router();

router.post('/send-donation-confirmation-to-donor', sendDonationConfirmationToDonor);

export default router;