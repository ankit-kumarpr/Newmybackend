const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order for lead acceptance
const createLeadAcceptanceOrder = async (vendorId, enquiryId) => {
  try {
    const options = {
      amount: 9 * 100, // ₹9 in paise
      currency: 'INR',
      receipt: `lead_${enquiryId}_${vendorId}`,
      notes: {
        vendorId: vendorId.toString(),
        enquiryId: enquiryId.toString(),
        type: 'lead_acceptance'
      }
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify payment signature
const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

module.exports = {
  createLeadAcceptanceOrder,
  verifyPayment
};