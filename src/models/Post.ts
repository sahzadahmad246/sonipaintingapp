import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML string or JSON
  coverImage: string;
  author: mongoose.Types.ObjectId;
  tags: string[];
  category: string;
  isPublished: boolean;
  publishedAt?: Date;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  readTime: number; // in minutes
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot be more than 150 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      maxlength: [300, "Excerpt cannot be more than 300 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    coverImage: {
      type: String,
      required: [true, "Cover image is required"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['Painting', 'POP', 'Carpentry', 'Tiling', 'General'],
        default: 'General'
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    readTime: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for text search
PostSchema.index({ title: "text", excerpt: "text", "seo.keywords": "text" });

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
