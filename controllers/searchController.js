const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Enquiry = require("../models/Enquiry");
const { getIO } = require("../socket/socketHandler");
const Payment = require("../models/Payment");
const { createLeadAcceptanceOrder, verifyPayment } = require("../services/razorpayService");


const findVendorsInRadius = async (userLat, userLon, keyword) => {
  try {
    console.log("🔍 SEARCH DEBUG ==================================");
    console.log("📍 User Location:", userLat, userLon);
    console.log("🔑 Search Keyword:", keyword);

    // ✅ CHANGE: "verified" instead of "approved"
    const allVendors = await Vendor.find({
      active: true,
      registrationStatus: "verified"  // ✅ CHANGED HERE
    });

    console.log("📊 Total verified vendors:", allVendors.length);

    const vendorsInRadius = [];
    
    for (let vendor of allVendors) {
      console.log(`\n🏪 Checking Vendor: ${vendor.businessName}`);
      console.log("📍 Vendor Coordinates:", vendor.businessLatitude, vendor.businessLongitude);
      console.log("🔑 Vendor Keywords:", vendor.keywords);
      console.log("📋 Vendor Status:", vendor.registrationStatus); // ✅ ADDED

      // Skip if no coordinates
      if (!vendor.businessLatitude || !vendor.businessLongitude) {
        console.log("❌ SKIP - No coordinates");
        continue;
      }

      // Calculate distance
      const distance = User.calculateDistance(userLat, userLon, vendor.businessLatitude, vendor.businessLongitude);
      console.log("📏 Distance:", distance, "km");

      // Check distance first
      if (distance > 10) {
        console.log("❌ REJECT - Outside 10km radius");
        continue;
      }

      // ✅ KEYWORD MATCHING
      const keywordLower = keyword.toLowerCase();
      
      const keywordMatch = vendor.keywords.some(kw => 
        kw.toLowerCase().includes(keywordLower)
      );
      
      const businessNameMatch = vendor.businessName.toLowerCase().includes(keywordLower);
      const titleMatch = vendor.title.toLowerCase().includes(keywordLower);

      console.log("🔍 Keyword Match:", keywordMatch);
      console.log("🏢 Business Name Match:", businessNameMatch);
      console.log("📝 Title Match:", titleMatch);

      // If any field matches
      if (keywordMatch || businessNameMatch || titleMatch) {
        vendorsInRadius.push({
          vendor: vendor._id,
          distance: Math.round(distance * 100) / 100,
          matchReason: `Matches "${keyword}" and ${distance}km away`
        });
        console.log("✅ ADDED - Within radius and keyword matches");
      } else {
        console.log("❌ REJECT - Keyword doesn't match");
      }
    }

    console.log("🎯 FINAL - Vendors found:", vendorsInRadius.length);
    console.log("==================================================\n");
    
    return vendorsInRadius;
  } catch (error) {
    console.error("Error finding vendors:", error);
    return [];
  }
};

// ✅ Get user's current location and update in database
const updateUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, address, city, state, pincode } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address || "",
          city: city || "",
          state: state || "",
          pincode: pincode || ""
        }
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Location updated successfully",
      data: user.location
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Get user's current location
const getUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("location");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user.location
    });
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Create search enquiry (Simple version - no budget/urgency)
const searchAndCreateEnquiry = async (req, res) => {
  try {
    const { searchKeyword, explanation } = req.body;
    const userId = req.user.id;

    if (!searchKeyword || !explanation) {
      return res.status(400).json({
        success: false,
        message: "Search keyword and explanation are required"
      });
    }

    // Get user details with location
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has location coordinates
    if (!user.location?.latitude || !user.location?.longitude) {
      return res.status(400).json({
        success: false,
        message: "Please enable location services to search for local vendors"
      });
    }

    // Find matching vendors within 10km radius
    const matchedVendors = await findVendorsInRadius(
      user.location.latitude,
      user.location.longitude,
      searchKeyword
    );

    if (matchedVendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vendors found within 10km radius matching your search",
        data: { matchedVendorsCount: 0 }
      });
    }

    // Create enquiry
    const enquiry = new Enquiry({
      user: userId,
      searchKeyword,
      explanation,
      userLocation: user.location,
      matchedVendors: matchedVendors
    });

    await enquiry.save();

    // Populate enquiry for real-time notification
    const populatedEnquiry = await Enquiry.findById(enquiry._id)
      .populate("user", "name email phone customId")
      .populate("matchedVendors.vendor", "businessName title mobileNumber email city");

    // ✅ REAL-TIME NOTIFICATIONS - Socket.io use karein
    const { getIO } = require("../socket/socketHandler");
    const io = getIO();
    
    for (let match of matchedVendors) {
      io.to(`vendor-${match.vendor}`).emit("new-enquiry", {
        enquiry: populatedEnquiry,
        message: `New enquiry for: ${searchKeyword}`,
        matchReason: match.matchReason,
        distance: match.distance,
        timestamp: new Date()
      });
      
      console.log(`📨 Real-time notification sent to vendor: ${match.vendor}`);
    }

    res.status(201).json({
      success: true,
      message: `Enquiry sent to ${matchedVendors.length} vendors within 10km radius`,
      data: {
        enquiry: populatedEnquiry,
        matchedVendorsCount: matchedVendors.length
      }
    });

  } catch (error) {
    console.error("Search enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ✅ Get user's enquiries
const getUserEnquiries = async (req, res) => {
  try {
    const userId = req.user.id;
    const enquiries = await Enquiry.find({ user: userId })
      .populate("matchedVendors.vendor", "businessName title mobileNumber email city")
      .sort({ createdAt: -1 });
      console.log("enquires are",enquiries);

    res.json({
      success: true,
      data: enquiries
    });
  } catch (error) {
    console.error("Get user enquiries error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Get vendor enquiries
const getVendorEnquiries = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const enquiries = await Enquiry.find({
      "matchedVendors.vendor": vendorId,
      status: "active"
    })
    .populate("user", "name email phone customId location")
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: enquiries
    });
  } catch (error) {
    console.error("Get vendor enquiries error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Vendor responds to enquiry
const updateEnquiryStatus = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { status, responseMessage = "" } = req.body;
    const vendorId = req.user.id;

    const enquiry = await Enquiry.findOneAndUpdate(
      {
        _id: enquiryId,
        "matchedVendors.vendor": vendorId
      },
      {
        $set: {
          "matchedVendors.$.status": status,
          "matchedVendors.$.respondedAt": new Date(),
          "matchedVendors.$.vendorResponse": responseMessage
        }
      },
      { new: true }
    ).populate("user", "name email phone");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    const io = getIO();
    io.to(`user-${enquiry.user._id}`).emit("enquiry-update", {
      enquiryId: enquiry._id,
      vendorId: vendorId,
      status: status,
      message: responseMessage || `Vendor has ${status} your enquiry`,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Enquiry ${status} successfully`,
      data: enquiry
    });
  } catch (error) {
    console.error("Update enquiry status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Search vendors for autocomplete
const searchVendorsByKeyword = async (req, res) => {
  try {
    const { keyword, latitude, longitude } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required"
      });
    }

    let vendors;
    
    if (latitude && longitude) {
      // ✅ CHANGE: "verified" instead of "approved"
      const allVendors = await Vendor.find({
        active: true,
        registrationStatus: "verified",  // ✅ CHANGED HERE
        $or: [
          { keywords: { $regex: keyword, $options: "i" } },
          { businessName: { $regex: keyword, $options: "i" } },
          { title: { $regex: keyword, $options: "i" } }
        ],
        businessLatitude: { $ne: null },
        businessLongitude: { $ne: null }
      });

      // Filter by distance
      vendors = allVendors.filter(vendor => {
        const distance = User.calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          vendor.businessLatitude,
          vendor.businessLongitude
        );
        return distance <= 10;
      }).slice(0, 10);
    } else {
      // ✅ CHANGE: "verified" instead of "approved"
      vendors = await Vendor.find({
        active: true,
        registrationStatus: "verified",  // ✅ CHANGED HERE
        $or: [
          { keywords: { $regex: keyword, $options: "i" } },
          { businessName: { $regex: keyword, $options: "i" } },
          { title: { $regex: keyword, $options: "i" } }
        ]
      })
      .select("businessName title city keywords")
      .limit(10);
    }

    res.json({
      success: true,
      data: vendors
    });
  } catch (error) {
    console.error("Search vendors error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



// payment


const initiateLeadAcceptance = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const vendorId = req.user.id;

    // Check if enquiry exists and vendor is matched
    const enquiry = await Enquiry.findOne({
      _id: enquiryId,
      "matchedVendors.vendor": vendorId,
      status: "active"
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found or you are not authorized"
      });
    }

    // Check if vendor already accepted this enquiry
    const vendorMatch = enquiry.matchedVendors.find(
      match => match.vendor.toString() === vendorId
    );

    if (vendorMatch.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "You have already accepted this enquiry"
      });
    }

    // Create Razorpay order
    const order = await createLeadAcceptanceOrder(vendorId, enquiryId);

    // Update enquiry status to payment_pending
    await Enquiry.findOneAndUpdate(
      {
        _id: enquiryId,
        "matchedVendors.vendor": vendorId
      },
      {
        $set: {
          "matchedVendors.$.status": "payment_pending",
          "matchedVendors.$.razorpayOrderId": order.id
        }
      }
    );

    // Create payment record
    const payment = new Payment({
      vendor: vendorId,
      enquiry: enquiryId,
      razorpayOrderId: order.id,
      amount: 9,
      currency: 'INR',
      status: 'pending'
    });

    await payment.save();

    res.json({
      success: true,
      message: "Payment initiated successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error("Initiate lead acceptance error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ✅ Verify payment and accept lead
const verifyLeadPayment = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const vendorId = req.user.id;

    // Verify payment
    const isPaymentValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isPaymentValid) {
      // Update payment status to failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { 
          status: 'failed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { 
        status: 'success',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        paymentMethod: 'razorpay'
      }
    );

    // Update enquiry status to accepted
    const enquiry = await Enquiry.findOneAndUpdate(
      {
        _id: enquiryId,
        "matchedVendors.vendor": vendorId
      },
      {
        $set: {
          "matchedVendors.$.status": "accepted",
          "matchedVendors.$.paymentStatus": "paid",
          "matchedVendors.$.respondedAt": new Date(),
          "matchedVendors.$.vendorResponse": "Enquiry accepted after payment"
        }
      },
      { new: true }
    ).populate("user", "name email phone");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    // Notify user about vendor acceptance
    const io = getIO();
    io.to(`user-${enquiry.user._id}`).emit("enquiry-update", {
      enquiryId: enquiry._id,
      vendorId: vendorId,
      status: "accepted",
      message: "Vendor has accepted your enquiry after payment",
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Payment successful and enquiry accepted",
      data: {
        enquiry: enquiry,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ✅ Vendor rejects enquiry (no payment required)
const rejectEnquiry = async (req, res) => {
  try {
    const { enquiryId } = req.params;
    const { responseMessage = "" } = req.body;
    const vendorId = req.user.id;

    const enquiry = await Enquiry.findOneAndUpdate(
      {
        _id: enquiryId,
        "matchedVendors.vendor": vendorId
      },
      {
        $set: {
          "matchedVendors.$.status": "rejected",
          "matchedVendors.$.respondedAt": new Date(),
          "matchedVendors.$.vendorResponse": responseMessage
        }
      },
      { new: true }
    ).populate("user", "name email phone");

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    // Notify user about vendor rejection
    const io = getIO();
    io.to(`user-${enquiry.user._id}`).emit("enquiry-update", {
      enquiryId: enquiry._id,
      vendorId: vendorId,
      status: "rejected",
      message: responseMessage || "Vendor has rejected your enquiry",
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: "Enquiry rejected successfully",
      data: enquiry
    });
  } catch (error) {
    console.error("Reject enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ Get vendor payment history
const getVendorPayments = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const payments = await Payment.find({ vendor: vendorId })
      .populate("enquiry", "searchKeyword explanation createdAt")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Get vendor payments error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


module.exports = {
  searchAndCreateEnquiry,
  getUserEnquiries,
  getVendorEnquiries,
  updateEnquiryStatus,
  searchVendorsByKeyword,
  updateUserLocation,
  getUserLocation,
  initiateLeadAcceptance, 
  verifyLeadPayment, 
  rejectEnquiry, 
  getVendorPayments,
};