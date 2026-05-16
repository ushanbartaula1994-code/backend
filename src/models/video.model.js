import mongoose,{Schema} from "mongoose"
import mongooseAggregratePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema(
  {
    videoFile: {
      type: string, //clloudinary url
      required: true,
    },
    thumbnail: {
      type: string, //clloudinary url
      required: true,
    },

    title: {
      type: string,
      required: true,
    },
    description: {
      type: string,
      required: true,
    },

    duration: {
      type: number,//cloudnary url
      required: true,
    },
    views:{
        type:number,
        default:0,
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggregratePaginate)

export const Video=mongoose.model("VIdeo",videoSchema)