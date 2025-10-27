/**
 * FAISSIndex Model
 *
 * Stores FAISS vector indices as binary data in MongoDB
 * Enables fast similarity search without needing external services
 *
 * Phase 3: FAISS Integration
 */

const mongoose = require('mongoose');

const faissIndexSchema = new mongoose.Schema({
  // Index identification
  indexName: {
    type: String,
    required: true,
    unique: true,
    default: 'user_feature_vectors' // Standard index name
  },

  // FAISS index as binary data
  indexData: {
    type: Buffer,
    required: true
  },

  // Metadata about the index
  metadata: {
    // Total vectors in this index
    vectorCount: {
      type: Number,
      required: true,
      default: 0
    },

    // Vector dimensions
    dimensions: {
      type: Number,
      required: true,
      default: 10
    },

    // Index type (e.g., 'IVFFlat', 'HNSW', etc.)
    indexType: {
      type: String,
      default: 'IVFFlat'
    },

    // Total size in bytes
    sizeInBytes: {
      type: Number,
      default: 0
    },

    // Performance metrics
    buildTime: {
      type: Number, // milliseconds
      default: 0
    },

    // When the index was built
    builtAt: {
      type: Date,
      default: Date.now
    },

    // User IDs included in this index (for reverse lookup)
    userIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Build status
    status: {
      type: String,
      enum: ['building', 'ready', 'corrupted'],
      default: 'ready'
    }
  },

  // Mapping from index ID to user ID
  idToUserMapping: {
    type: Map,
    of: mongoose.Schema.Types.ObjectId,
    default: new Map()
  },

  // Version tracking for FAISS changes
  indexVersion: {
    type: String,
    default: '1.0'
  },

  // Configuration used to build this index
  buildConfig: {
    vectorDimensions: {
      type: Number,
      default: 10
    },
    indexType: {
      type: String,
      default: 'IVFFlat'
    },
    nlist: {
      type: Number,
      default: 10 // Number of clustering cells for IVFFlat
    },
    metric: {
      type: String,
      default: 'L2' // L2 or IP (inner product)
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
faissIndexSchema.index({ indexName: 1 });
faissIndexSchema.index({ 'metadata.status': 1 });
faissIndexSchema.index({ 'metadata.builtAt': -1 });

// Virtual for index age in hours
faissIndexSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const built = new Date(this.metadata.builtAt);
  return (now - built) / (1000 * 60 * 60);
});

// Virtual for whether index needs rebuild
faissIndexSchema.virtual('needsRebuild').get(function() {
  return this.ageInHours > 24; // Rebuild if older than 24 hours
});

// Pre-save hook to update timestamp
faissIndexSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to get user ID from index position
faissIndexSchema.methods.getUserIdAtIndex = function(indexPosition) {
  return this.idToUserMapping.get(indexPosition.toString());
};

// Instance method to add user mapping
faissIndexSchema.methods.addUserMapping = function(indexPosition, userId) {
  this.idToUserMapping.set(indexPosition.toString(), userId);
};

// Static method to get current index
faissIndexSchema.statics.getCurrentIndex = function() {
  return this.findOne({ 'metadata.status': 'ready' })
    .sort({ 'metadata.builtAt': -1 });
};

// Static method to get index building status
faissIndexSchema.statics.getIndexStatus = function() {
  return this.findOne({ indexName: 'user_feature_vectors' });
};

// Static method to mark index as building
faissIndexSchema.statics.markAsBuilding = async function() {
  return this.updateOne(
    { indexName: 'user_feature_vectors' },
    { 'metadata.status': 'building' },
    { upsert: true }
  );
};

// Static method to mark index as ready
faissIndexSchema.statics.markAsReady = async function() {
  return this.updateOne(
    { indexName: 'user_feature_vectors' },
    { 'metadata.status': 'ready', 'metadata.builtAt': new Date() },
    { upsert: true }
  );
};

// Static method to mark index as corrupted
faissIndexSchema.statics.markAsCorrupted = async function() {
  return this.updateOne(
    { indexName: 'user_feature_vectors' },
    { 'metadata.status': 'corrupted' }
  );
};

const FAISSIndex = mongoose.model('FAISSIndex', faissIndexSchema);

module.exports = FAISSIndex;
