# TODO - SL1 Topology System Issues

**Current Issues & Missing Features** - Updated December 2024

---

## 🚨 **Critical Issues (Blocking User Workflow)**

### 1. **Remove from Canvas Not Working**
- **Issue**: X button on topology nodes doesn't remove devices from canvas
- **Status**: ❌ Not Working
- **Priority**: High
- **Location**: `/frontend/src/components/TopologyCanvas/EnterpriseTopologyFlow.tsx`
- **Details**: 
  - X button appears on hover but clicking does nothing
  - `onRemoveDevice` callback chain may be broken
  - Need to debug the event handling and state updates

### 2. **Canvas Layout Snaps Back on New Device**
- **Issue**: When adding additional devices from list, canvas resets to original layout
- **Status**: ❌ Not Working
- **Priority**: High  
- **Location**: `/frontend/src/components/TopologyCanvas/EnterpriseTopologyFlow.tsx`
- **Details**:
  - User manually positions nodes
  - Adding new device triggers layout algorithm
  - All manual positioning is lost
  - Need to preserve existing node positions when adding new devices

### 3. **No Interactive Device Selection on Canvas**
- **Issue**: Cannot click on device in topology to explore its relationships
- **Status**: ❌ Missing Feature
- **Priority**: High
- **Location**: `/frontend/src/components/TopologyCanvas/EnterpriseTopologyFlow.tsx`
- **Details**:
  - Should be able to click device node to see its children/parents
  - Need topology expansion functionality  
  - Should integrate with SL1 relationship APIs
  - Core feature for network exploration

---

## 🔍 **Enhancement Opportunities**

### 4. **Total Device Count Display**
- **Issue**: Cannot show "X of Y total devices" in inventory
- **Status**: ❌ Not Working (SL1 GraphQL limitation)
- **Priority**: Medium
- **Details**: 
  - SL1 GraphQL doesn't support `totalCount` field
  - Need alternative approach (separate query or estimate)
  - Currently shows "X devices (more available)"

### 5. **Advanced Topology Features**
- **Issue**: Missing advanced topology visualization features
- **Status**: 🔄 Future Enhancement
- **Priority**: Medium
- **Features Needed**:
  - Multi-level relationship depth control
  - Direction control (parents vs children vs both)
  - Real-time relationship updates
  - Advanced filtering (by device type, status, etc.)

### 6. **Performance Optimizations**
- **Issue**: Large topologies may have performance issues
- **Status**: 🔄 Monitoring
- **Priority**: Low
- **Areas**:
  - Virtual rendering for 1000+ node topologies
  - Lazy loading of relationship data
  - Caching optimization

---

## ✅ **Recently Fixed Issues**

### ✅ **Cursor Pagination** (Fixed Dec 2024)
- **Issue**: Load More showed same devices repeatedly
- **Solution**: Implemented proper SL1 GraphQL cursor-based pagination
- **Status**: ✅ Working

### ✅ **Phantom Connections** (Fixed Dec 2024)  
- **Issue**: Random lines between unrelated devices
- **Solution**: Added strict edge validation and filtering
- **Status**: ✅ Working

### ✅ **Device Loading Failures** (Fixed Dec 2024)
- **Issue**: Lambda 500 errors breaking device list
- **Solution**: Removed unsupported GraphQL fields, added error handling
- **Status**: ✅ Working

---

## 🛠️ **Development Notes**

### Testing Approach
1. **Device Removal**: Test X button click → console logs → state updates → UI refresh
2. **Layout Preservation**: Add device → check if existing nodes stay in position
3. **Canvas Interaction**: Click node → verify onNodeClick → relationship expansion

### Key Files to Modify
- `EnterpriseTopologyFlow.tsx` - Main topology component
- `App.tsx` - Parent state management  
- `api.ts` - SL1 relationship queries
- Backend Lambda functions for relationship data

### SL1 Integration Requirements
- Device relationship GraphQL queries
- Parent/child relationship traversal
- Real-time topology data updates

---

**Last Updated**: December 24, 2024
**Next Review**: After critical issues are resolved