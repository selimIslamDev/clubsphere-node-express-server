import { getDB } from "../config/db.js";

export const getAdminStats = async (req, res) => {
  const db = getDB();
  try {
    const [
      totalUsers, totalClubs, pendingClubs, approvedClubs, rejectedClubs,
      totalMemberships, totalEvents, totalPayments,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("clubs").countDocuments(),
      db.collection("clubs").countDocuments({ status: "pending" }),
      db.collection("clubs").countDocuments({ status: "approved" }),
      db.collection("clubs").countDocuments({ status: "rejected" }),
      db.collection("memberships").countDocuments({ status: "active" }),
      db.collection("events").countDocuments(),
      db.collection("payments").aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).toArray(),
    ]);

    // Monthly payment data for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyPayments = await db.collection("payments").aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: "completed" } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();

    // Memberships per club (top 5)
    const membershipsPerClub = await db.collection("memberships").aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$clubId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalClubs,
        pendingClubs,
        approvedClubs,
        rejectedClubs,
        totalMemberships,
        totalEvents,
        totalRevenue: totalPayments[0]?.total || 0,
      },
      charts: {
        monthlyPayments,
        membershipsPerClub,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getManagerStats = async (req, res) => {
  const db = getDB();
  try {
    const clubs = await db.collection("clubs").find({ managerEmail: req.user.email }).toArray();
    const clubIds = clubs.map((c) => c._id.toString());

    const [totalMembers, totalEvents, totalRevenue] = await Promise.all([
      db.collection("memberships").countDocuments({ clubId: { $in: clubIds }, status: "active" }),
      db.collection("events").countDocuments({ clubId: { $in: clubIds } }),
      db.collection("payments").aggregate([
        { $match: { clubId: { $in: clubIds }, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).toArray(),
    ]);

    res.json({
      success: true,
      stats: {
        totalClubs: clubs.length,
        totalMembers,
        totalEvents,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
