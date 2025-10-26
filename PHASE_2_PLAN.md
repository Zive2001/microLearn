# PHASE 2: KEYPOINT SELECTION MODAL

## 📋 Overview
Create a modal where users can review and refine the extracted keypoints before generating micro-learning content. Users will also select their preferred teacher voice.

---

## 🎯 What Will Be Done

### 1. Create KeypointSelectionModal Component
**File**: `frontend/src/components/KeypointSelectionModal.jsx`

**Features**:
- Display 5-7 recommended keypoints from video
- Allow user to toggle keypoints on/off
- Allow user to add custom keypoints (up to 12 total)
- Teacher voice selection (Ava, Andrew, Emma, Brian, Jenny)
- Show estimated duration (based on keypoint count)
- Confirm button to proceed with generation

**User Flow**:
```
User clicks "Start Microlearning" on video card
    ↓
Modal opens showing:
  • Video title
  • 5-7 recommended keypoints (blue pills with checkboxes)
  • "+ Add Custom Topic" input field
  • Teacher voice selector (5 options)
  • "Generating content will take X-Y minutes"
  • Cancel / Generate buttons
    ↓
User can:
  • Toggle keypoints on/off (select which ones to include)
  • Add custom keypoints
  • Choose teacher voice
  • See estimated duration
    ↓
User clicks "Generate" button
    ↓
Modal closes, navigate to MicrolearningPage with selected config
    ↓
MicrolearningPage receives in location.state:
  • keypoints: ["Topic1", "Topic2", ...]
  • teacher: "Ava"
  • videoId: "..."
  • youtubeUrl: "..."
```

### 2. Modify VideoRecommendations Component
**File**: `frontend/src/pages/VideoRecommendations.jsx`

**Changes**:
- Add state for modal: `isKeyPointModalOpen`, `selectedVideoForKeypoints`
- Modify `handleVideoClick()` to open modal instead of direct navigation
- Add `handleKeyPointConfirm()` to process modal submission
- Pass modal props: `isOpen`, `video`, `onClose`, `onConfirm`

### 3. Modify MicrolearningPage Component
**File**: `frontend/src/pages/MicrolearningPage.jsx`

**Changes**:
- Check for `location.state?.keypoints` in useEffect
- If keypoints exist: Trigger Phase 3 endpoint (generate based on keypoints)
- If no keypoints: Use fallback to mock data (existing behavior)
- Pass keypoint data to quiz system for better question generation

---

## 🔄 Data Flow

```
VideoRecommendations.jsx
  └─ Click "Start Microlearning"
      ↓
  KeypointSelectionModal.jsx (NEW)
      ├─ Show recommended keypoints
      ├─ Allow selection/customization
      ├─ Show teacher options
      └─ Confirm selection
      ↓
  handleKeyPointConfirm()
      ├─ Collect: keypoints, teacher, videoId, youtubeUrl
      └─ Navigate to MicrolearningPage with location.state
      ↓
MicrolearningPage.jsx
  └─ Check location.state?.keypoints
      ├─ YES → Prepare for Phase 3 generation
      └─ NO  → Use mock data (fallback)
```

---

## 📝 Changes Summary

### Frontend Changes

**New File**:
```javascript
// frontend/src/components/KeypointSelectionModal.jsx (~300 lines)
- Export KeypointSelectionModal component
- Props: isOpen, video, onClose, onConfirm
- State: selectedKeypoints, customKeypoint, selectedTeacher
- Functions:
  - toggleKeypoint(keypoint)
  - addCustomKeypoint()
  - handleConfirm()
```

**Modified Files**:
```javascript
// frontend/src/pages/VideoRecommendations.jsx (+80 lines)
- Import KeypointSelectionModal
- Add state: isKeyPointModalOpen, selectedVideoForKeypoints
- Update handleVideoClick() → open modal instead of navigate
- Add handleKeyPointConfirm() → navigate with keypoint state
- Add <KeypointSelectionModal /> component

// frontend/src/pages/MicrolearningPage.jsx (+15 lines)
- Add check: if (location.state?.keypoints) exists
- Prepare for Phase 3 endpoint call
- Store keypoints in state for quiz system
```

### Backend Changes
**None for Phase 2** - Phase 2 is frontend only

---

## 🎨 UI Design

### Modal Layout
```
┌─ Keypoint Selection Modal ─────────────────────────────────────────┐
│                                                                    │
│  Generate Focused Learning Content                            [X] │
│  "JavaScript Variables and Scope"                                 │
│  ──────────────────────────────────────────────────────────────   │
│                                                                    │
│  Select Learning Topics (3-12)                                    │
│  Each topic will generate 1000+ word script with avatar video     │
│                                                                    │
│  Recommended Topics:                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ☑ Variable Declaration  ☐ Data Types  ☐ Functions        │  │
│  │ ☑ Scope Concepts        ☐ Hoisting    ☐ Best Practices   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Add Custom Topic:                                                │
│  ┌─────────────────────────────┐  [+ Add]                        │
│  │ Enter custom topic...       │                                  │
│  └─────────────────────────────┘                                  │
│                                                                    │
│  Selected Topics (5/12):                                          │
│  [Variable Declaration] [Scope Concepts] [Functions]              │
│  [Hoisting] [Best Practices]                                      │
│                                                                    │
│  Select Teacher Voice                                             │
│  [Ava] [Andrew] [Emma] [Brian] [Jenny]                            │
│                                                                    │
│  Estimated Duration: 35-50 minutes                                │
│  5 topics × 1000+ words = 5000+ words of content                 │
│  ──────────────────────────────────────────────────────────────   │
│                                                                    │
│  [Cancel]                    [🚀 Generate Learning Content]       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

- [ ] Create KeypointSelectionModal.jsx component
- [ ] Add modal state to VideoRecommendations
- [ ] Update handleVideoClick to open modal
- [ ] Add handleKeyPointConfirm function
- [ ] Update MicrolearningPage to check for keypoints
- [ ] Test: Modal opens when clicking "Start Microlearning"
- [ ] Test: Can toggle keypoints on/off
- [ ] Test: Can add custom keypoints
- [ ] Test: Can select teacher voice
- [ ] Test: Estimated duration updates correctly
- [ ] Test: Confirm button navigates with correct data
- [ ] Test: MicrolearningPage receives keypoint data

---

## 🧪 Testing Steps

1. **Test Modal Opening**
   - Click "Start Microlearning" on a video card
   - Verify modal appears with keypoints

2. **Test Keypoint Selection**
   - Toggle some keypoints off
   - Add a custom keypoint
   - Verify selections update

3. **Test Teacher Selection**
   - Click different teacher names
   - Verify selection is highlighted

4. **Test Confirmation**
   - Click "Generate Learning Content"
   - Verify navigation to MicrolearningPage with correct data
   - Check browser console: should see keypoints in location.state

5. **Test Data Passing**
   - Open browser DevTools
   - Check Network tab for navigation
   - Verify location.state contains:
     ```javascript
     {
       keypoints: ["Topic1", "Topic2", ...],
       teacher: "Ava",
       videoId: "...",
       youtubeUrl: "...",
       videoTitle: "...",
       videoData: {...}
     }
     ```

---

## 🔗 Integration Points

### With Phase 1
- ✅ Uses keypoints extracted in Phase 1
- ✅ Displays them in the modal
- ✅ Allows user to refine them

### With Phase 3
- ⏳ Passes selected keypoints to Phase 3 generation
- ⏳ Phase 3 uses these keypoints for micro-video generation
- ⏳ Teacher selection is used for avatar voice

### With Quiz System
- ⏳ Quiz system will use selected keypoints
- ⏳ Questions generated specifically for selected topics
- ⏳ Better focused learning experience

---

## 📊 Component Tree

```
App
└─ VideoRecommendations
    ├─ Video Cards
    │  └─ "Start Microlearning" button
    └─ KeypointSelectionModal (NEW)
        ├─ Keypoints List
        ├─ Custom Keypoint Input
        ├─ Teacher Selector
        └─ Confirm Button

MicrolearningPage
├─ Check location.state?.keypoints
└─ Prepare for Phase 3 generation
```

---

## ⏱️ Estimated Time

- Create modal component: 45 min
- Integrate with VideoRecommendations: 30 min
- Update MicrolearningPage: 15 min
- Testing & fixes: 30 min
- **Total: 2-3 hours**

---

## ✨ Key Features

1. **Visual Feedback**: Blue pills, checkmarks, counts
2. **Flexibility**: Toggle any keypoint, add custom ones
3. **User Control**: Choose exactly what to learn
4. **Teacher Selection**: Pick preferred voice
5. **Duration Preview**: See estimated time before generating
6. **Smooth Flow**: Modal to generation seamlessly

---

## 📦 No Backend Changes Needed

Phase 2 is **frontend only**. Backend remains unchanged.

- No new API endpoints
- No database changes
- No new dependencies
- Just better user experience

---

## 🎯 Success Criteria

✅ Modal opens when clicking "Start Microlearning"
✅ Can select/deselect keypoints
✅ Can add custom keypoints
✅ Can select teacher voice
✅ Estimated duration updates correctly
✅ Confirm button works and navigates correctly
✅ Data is passed to MicrolearningPage via location.state
✅ No console errors
✅ Responsive on mobile/tablet/desktop

---

## 📝 Summary of Changes

| File | Change | Lines | Status |
|------|--------|-------|--------|
| `KeypointSelectionModal.jsx` | NEW | +300 | ⏳ To Do |
| `VideoRecommendations.jsx` | MODIFIED | +80 | ⏳ To Do |
| `MicrolearningPage.jsx` | MODIFIED | +15 | ⏳ To Do |
| Backend | NONE | 0 | ✅ N/A |

**Total Changes**: ~395 frontend lines (NEW component + integrations)

---

**Status**: ⏳ READY TO IMPLEMENT
**Next Step**: After Phase 1 testing confirms working
