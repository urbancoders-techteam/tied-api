const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Staff",
         required: true,
       },
       updatedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Staff",
         required: false,
         default: null,
       },
     },
     {
       timestamps: true,
     }
   );

const Event = mongoose.model("Event", EventSchema);

module.exports = Event;
