const Order = require("../model/order");

exports.generateOrderUniqueID = async () =>
{
    let prefix;
    let lastOrder;

    prefix = "TIED_ORD_";
    lastOrder = await Order.findOne({}, {}, { sort: { createdAt: -1 } });

    let id = "001";

    if (lastOrder) {
        const lastUniqueId = (lastOrder.orderId || "").replace(prefix, "");
        const incrementedUniqueId = (parseInt(lastUniqueId, 10) + 1)
            .toString()
            .padStart(3, "0");
        id = incrementedUniqueId;
    }
    return prefix + id;
};


