const User = require("../models/User");

// Update user location
const updateUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, city, state, pincode, latitude, longitude } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          address: address || "",
          city: city || "",
          state: state || "",
          pincode: pincode || "",
          latitude: latitude || null,
          longitude: longitude || null
        }
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Location updated successfully",
      data: user
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Add this to your exports
module.exports = {
  // ... your existing exports ...
  updateUserLocation
};