"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  Package,
  Building2,
  Search,
  RefreshCw,
  DollarSign,
  Database,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  ImageIcon,
  X,
  Star,
  Edit,
  Save,
  Shield,
  Users,
  Tag,
  Plus,
} from "lucide-react"

const TallyStockDashboard = () => {
  const [stockData, setStockData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [groupedData, setGroupedData] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState({
    tally: { connected: false, message: "" },
    database: { connected: false, totalItems: 0, lastSync: null },
  })
  const [dataSource, setDataSource] = useState("") // 'TALLY', 'DATABASE', 'CACHE'
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedGroups, setExpandedGroups] = useState({})
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null,
    pendingItems: 0,
    totalItems: 0,
    syncStatus: "UNKNOWN",
  })
  const [selectedItem, setSelectedItem] = useState(null)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [itemImages, setItemImages] = useState({})
  
  // New states for manual fields
  const [showFieldEditor, setShowFieldEditor] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [fieldUpdates, setFieldUpdates] = useState({ grandGroup: "", warranty: "" })
  const [updatingFields, setUpdatingFields] = useState(false)

  const API_BASE = "http://localhost:8000/api/tally"

  // Memoized helper functions
  const formatValue = useCallback((value) => {
    if (value === null || value === undefined || value === "") {
      return ""
    }
    
    // Handle objects with _ property (Tally data structure)
    if (typeof value === "object" && value !== null) {
      if (value._ !== undefined) {
        return String(value._)
      }
      if (value.VALUE !== undefined) {
        return String(value.VALUE)
      }
      if (value.NAME !== undefined) {
        return String(value.NAME)
      }
      // If it's still an object, convert to JSON string as fallback
      return JSON.stringify(value)
    }
    
    return String(value)
  }, [])

  const formatCurrency = useCallback((value) => {
    if (value === null || value === undefined || value === "" || value === 0) {
      return "0.00"
    }
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) {
      return "0.00"
    }
    return numValue.toFixed(2)
  }, [])

  const getUnit = useCallback((item) => {
    return item.displayUnit || item.baseUnits || "Pcs"
  }, [])

  // Memoized grouping function
  const groupStockData = useMemo(() => {
    return (data) => {
      const grouped = {}

      data.forEach((item, index) => {
        // Get parent group from PARENT field - keep exact same logic for both online/offline
        let parentGroup = "OFFLINE SAVED STOCK ITEMS"

        if (item.parent && typeof item.parent === 'string' && item.parent.trim() !== '' && item.parent.trim() !== '{}') {
          parentGroup = item.parent.toUpperCase().trim()
        }

        // Initialize parent group if not exists
        if (!grouped[parentGroup]) {
          grouped[parentGroup] = []
        }

        // Add item directly to parent group (no sub-categories)
        grouped[parentGroup].push({
          ...item,
          originalIndex: index,
        })
      })

      return grouped
    }
  }, [])

  // Memoized edit handler to prevent recreating on every render
  const handleEditClick = useCallback((item) => {
    setEditingItem(item)
    setFieldUpdates({ 
      grandGroup: item.grandGroup || "", 
      warranty: item.warranty || "" 
    })
    setShowFieldEditor(true)
  }, [])

  // Memoized image handler
  const handleImageClick = useCallback((item) => {
    setSelectedItem(item)
    setShowImageUpload(true)
    if (item.id) fetchItemImages(item.id)
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const result = await response.json()
        setConnectionStatus(result)
        return result
      } else {
        setConnectionStatus({
          tally: { connected: false, message: "Server not responding" },
          database: { connected: false, totalItems: 0, lastSync: null },
        })
        return null
      }
    } catch (err) {
      setConnectionStatus({
        tally: { connected: false, message: "Connection failed" },
        database: { connected: false, totalItems: 0, lastSync: null },
      })
      return null
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/sync-status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSyncStatus(result.data)
        }
      }
    } catch (err) {
      console.error("Failed to fetch sync status:", err)
    }
  }

  const refreshItemData = async (itemId) => {
    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const updatedItem = result.data
          
          // Update the item in all state arrays
          const updateItem = (item) => {
            if (item.id === itemId) {
              return {
                ...item,
                grandGroup: updatedItem.grandGroup || "",
                warranty: updatedItem.warranty || "",
              }
            }
            return item
          }
          
          setStockData(prevData => prevData.map(updateItem))
          setFilteredData(prevData => prevData.map(updateItem))
          
          // Update grouped data
          setGroupedData(prevGrouped => {
            const newGrouped = {}
            Object.keys(prevGrouped).forEach(groupKey => {
              newGrouped[groupKey] = prevGrouped[groupKey].map(updateItem)
            })
            return newGrouped
          })
        }
      }
    } catch (error) {
      console.error('Failed to refresh item data:', error)
    }
  }

  // Update manual fields
  const updateManualFields = async (itemId, grandGroup, warranty) => {
    setUpdatingFields(true)
    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}/manual-fields`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grandGroup, warranty }),
      })
  
      const result = await response.json()
  
      if (result.success) {
        console.log(`[SUCCESS] Manual fields updated for item ${itemId}:`, {
          grandGroup: grandGroup.trim(),
          warranty: warranty.trim()
        })
        
        // ENHANCED: Update local state immediately with the server response data
        const serverUpdatedItem = result.data
        
        const updateItem = (item) => {
          if (item.id === itemId || item.tallyId === itemId || item._id === itemId) {
            return { 
              ...item, 
              grandGroup: serverUpdatedItem.grandGroup || "", 
              warranty: serverUpdatedItem.warranty || "" 
            }
          }
          return item
        }
        
        // Update all related state arrays
        setStockData(prevData => prevData.map(updateItem))
        setFilteredData(prevData => prevData.map(updateItem))
        
        // Update grouped data
        setGroupedData(prevGrouped => {
          const newGrouped = {}
          Object.keys(prevGrouped).forEach(groupKey => {
            newGrouped[groupKey] = prevGrouped[groupKey].map(updateItem)
          })
          return newGrouped
        })
  
        // Close modal and clear states
        setError("")
        setShowFieldEditor(false)
        setEditingItem(null)
        setFieldUpdates({ grandGroup: "", warranty: "" })
        
        // REMOVED: Don't call fetchStockRates() here as it overwrites local state
        // The local state update above is sufficient and immediate
        
      } else {
        setError(`Update failed: ${result.message}`)
      }
    } catch (err) {
      setError(`Update error: ${err.message}`)
    } finally {
      setUpdatingFields(false)
    }
  }

  const handleImageUpload = async (files, itemId) => {
    if (!files || files.length === 0) return

    console.log("[v0] Uploading images for item ID:", itemId)

    setUploadingImages(true)
    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append("images", file)
    })

    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}/images`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      console.log("[v0] Image upload response:", result)

      if (result.success) {
        // Refresh item images
        await fetchItemImages(itemId)
        setError("")
      } else {
        setError(`Image upload failed: ${result.message}`)
      }
    } catch (err) {
      setError(`Image upload error: ${err.message}`)
    } finally {
      setUploadingImages(false)
    }
  }

  const fetchItemImages = async (itemId) => {
    console.log("[v0] Fetching images for item ID:", itemId)

    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}`)
      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Fetch images response:", result)
        if (result.success) {
          setItemImages((prev) => ({
            ...prev,
            [itemId]: result.data.images || [],
          }))
        }
      }
    } catch (err) {
      console.error("Failed to fetch item images:", err)
    }
  }

  const setPrimaryImage = async (itemId, imageUrl) => {
    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}/images/${encodeURIComponent(imageUrl)}/primary`, {
        method: "PUT",
      })

      if (response.ok) {
        await fetchItemImages(itemId)
      }
    } catch (err) {
      console.error("Failed to set primary image:", err)
    }
  }

  const deleteImage = async (itemId, imageUrl) => {
    try {
      const response = await fetch(`${API_BASE}/stock-items/${itemId}/images/${encodeURIComponent(imageUrl)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchItemImages(itemId)
      }
    } catch (err) {
      console.error("Failed to delete image:", err)
    }
  }

  // Simple price parsing function
  const parsePrice = (item, fieldType) => {
    let value = 0
    let unit = "Pcs"

    // Try multiple fields in priority order
    const priceFields =
      fieldType === "price"
        ? ["RATE", "SALESRATE", "LISTPRICE", "STANDARDPRICE", "BASICRATE", "PRICE", "MRP"]
        : ["STANDARDCOST", "PURCHASERATE", "COST", "AVGCOST", "LASTPURCHASERATE"]

    let priceData = null

    // Find the first available price field
    for (const field of priceFields) {
      if (item[field] !== undefined && item[field] !== null && item[field] !== "") {
        priceData = item[field]
        break
      }
    }

    if (!priceData) {
      return { value: 0, unit: "Pcs" }
    }

    // Handle nested structure like {_: "149.00/Pcs", TYPE: "Rate"}
    if (typeof priceData === "object" && priceData !== null) {
      const priceStr = priceData._ || priceData.VALUE || priceData.AMOUNT || priceData.RATE

      if (typeof priceStr === "string") {
        const priceUnitMatch = priceStr.match(/^([\d.,]+)\s*\/\s*([A-Za-z]+)$/)
        if (priceUnitMatch) {
          value = Number.parseFloat(priceUnitMatch[1].replace(/,/g, ""))
          unit = priceUnitMatch[2]
        } else {
          const numericMatch = priceStr.match(/([\d.,]+)/)
          if (numericMatch) {
            value = Number.parseFloat(numericMatch[1].replace(/,/g, ""))
          }
        }
      } else if (typeof priceStr === "number") {
        value = priceStr
      }
    }
    // Handle direct numeric values
    else if (typeof priceData === "number") {
      value = priceData
    }
    // Handle string numeric values
    else if (typeof priceData === "string") {
      const priceUnitMatch = priceData.match(/^([\d.,]+)\s*\/\s*([A-Za-z]+)$/)
      if (priceUnitMatch) {
        value = Number.parseFloat(priceUnitMatch[1].replace(/,/g, ""))
        unit = priceUnitMatch[2]
      } else {
        const numericMatch = priceData.match(/([\d.,]+)/)
        if (numericMatch) {
          value = Number.parseFloat(numericMatch[1].replace(/,/g, ""))
        }
      }
    }

    if (isNaN(value)) {
      value = 0
    }

    return { value, unit }
  }

  // Simple unit detection
  const detectUnit = (item) => {
    // Priority order: parsed unit from price > baseUnits > default
    if (item.priceUnit && item.priceUnit !== "Pcs") {
      return item.priceUnit
    }

    if (item.baseUnits && item.baseUnits !== "Pcs") {
      return item.baseUnits
    }

    return "Pcs"
  }

  const fetchStockRates = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE}/stock-rates`, {
        method: "GET",
      })

      const result = await response.json()

      if (!result.success) {
        // If API call fails, try to get cached data
        console.warn("API call failed, attempting to get cached data:", result.message)
        
        // Check if we have database connection for offline data
        const connectionCheck = await checkConnection()
        if (connectionCheck && connectionCheck.database.connected && connectionCheck.database.totalItems > 0) {
          // Try to fetch database/cached data
          try {
            const cachedResponse = await fetch(`${API_BASE}/stock-rates?source=database`, {
              method: "GET",
            })
            const cachedResult = await cachedResponse.json()
            
            if (cachedResult.success) {
              processStockData(cachedResult, "DATABASE")
              return
            }
          } catch (cachedErr) {
            console.warn("Failed to fetch cached data:", cachedErr)
          }
        }
        
        throw new Error(result.message || "Failed to fetch stock rates")
      }

      processStockData(result, result.data?.source || "TALLY")

    } catch (err) {
      console.error("Error fetching stock rates:", err)
      
      // Last resort: try to get any available data
      try {
        const fallbackResponse = await fetch(`${API_BASE}/stock-rates?fallback=true`, {
          method: "GET",
        })
        const fallbackResult = await fallbackResponse.json()
        
        if (fallbackResult.success && fallbackResult.data?.stockItems?.length > 0) {
          await processStockData(fallbackResult, fallbackResult.data?.source || "DATABASE")
          return
        }
      } catch (fallbackErr) {
        console.warn("Fallback data fetch failed:", fallbackErr)
      }
      
      setError(`Error fetching stock rates: ${err.message}`)
      setStockData([])
      setFilteredData([])
      setGroupedData({})
    } finally {
      setLoading(false)
    }
  }

  const processStockData = (result, source) => {
    // Set data source info
    setDataSource(source)

    // Try different possible response structures
    const stockItems = result.data?.stockItems || result.data?.items || result.data || []

    console.log(`[v0] Processing ${source} data - Raw API response sample:`, stockItems.slice(0, 2))

    if (stockItems && Array.isArray(stockItems) && stockItems.length > 0) {
      // Transform the data
      const transformedData = stockItems.map((item, index) => {
        // Handle nested object structures for all fields
        const itemName = formatValue(item.NAME || item.name || item.DSPDISPNAME || item.particulars || `Item ${index + 1}`)
        const baseUnits = formatValue(item.BASEUNITS?._ || item.BASEUNITS || item.baseUnits || item.UNIT || item.unit || "Pcs")
        const parentGroup = formatValue(item.PARENT?._ || item.PARENT || item.parent || item.category || "")
        const hsnCode = formatValue(item.HSNCODE?._ || item.HSNCODE || item.hsnCode || item.hsn || "")
        
        // Extract manual fields (these should come from database, not Tally)
        // KEY FIX: Handle multiple possible field locations and structures
        let grandGroup = ""
        let warranty = ""
        
        // Try multiple possible locations for manual fields
        if (item.grandGroup !== undefined && item.grandGroup !== null && String(item.grandGroup).trim() !== "") {
          grandGroup = String(item.grandGroup).trim()
        } else if (item.manualFields?.grandGroup !== undefined && String(item.manualFields.grandGroup).trim() !== "") {
          grandGroup = String(item.manualFields.grandGroup).trim()
        }
        
        if (item.warranty !== undefined && item.warranty !== null && String(item.warranty).trim() !== "") {
          warranty = String(item.warranty).trim()
        } else if (item.manualFields?.warranty !== undefined && String(item.manualFields.warranty).trim() !== "") {
          warranty = String(item.manualFields.warranty).trim()
        }
        console.log(`[DEBUG] Item ${itemName}: grandGroup="${grandGroup}", warranty="${warranty}", raw grandGroup:`, item.grandGroup, 'raw warranty:', item.warranty)

        // Parse prices
        const priceResult = parsePrice(item, "price")

        // KEY FIX: Better ID handling to ensure consistency
        const itemId = item.tallyId || (item._id ? item._id.toString() : null) || `item_${index}`

        const transformedItem = {
          id: itemId,
          name: itemName,
          baseUnits: baseUnits,
          parent: parentGroup,
          hsnCode: hsnCode,
          grandGroup: grandGroup, // Add manual field
          warranty: warranty, // Add manual field
          standardPrice: priceResult.value,
          priceUnit: priceResult.unit,
          index: index,
          tallyId: item.tallyId,
          mongoId: item._id,
          source: source, // Add source info to each item
        }

        // Detect the best unit to use
        transformedItem.displayUnit = detectUnit(transformedItem)

        return transformedItem
      })

      console.log(
        `[v0] Final transformed ${source} data sample:`,
        transformedData.slice(0, 3).map((item) => ({
          id: item.id,
          name: item.name,
          parent: item.parent,
          grandGroup: item.grandGroup,
          warranty: item.warranty,
          source: item.source,
          tallyId: item.tallyId,
          mongoId: item.mongoId,
        })),
      )

      setStockData(transformedData)
      setFilteredData(transformedData)
      setGroupedData(groupStockData(transformedData))
      setLastUpdated(new Date().toLocaleString())
      setError("")
    } else {
      const errorMsg = source === "DATABASE" || source === "CACHE" 
        ? "No cached stock data available" 
        : "No stock items found"
      
      setError(errorMsg)
      setStockData([])
      setFilteredData([])
      setGroupedData({})
    }
  }

  const performManualSync = async () => {
    setSyncing(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE}/sync-now`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data after successful sync
        await fetchStockRates()
        await fetchSyncStatus()
        setError("")
      } else {
        throw new Error(result.message || "Sync failed")
      }
    } catch (err) {
      setError(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      await checkConnection()
      await fetchStockRates()
      await fetchSyncStatus()
    }
    init()

    // Auto-refresh connection status every 30 seconds
    const statusInterval = setInterval(checkConnection, 30000)
    const syncStatusInterval = setInterval(fetchSyncStatus, 60000) // Check sync status every minute

    return () => {
      clearInterval(statusInterval)
      clearInterval(syncStatusInterval)
    }
  }, [])

  // Memoized filtered and grouped data
  const memoizedFilteredData = useMemo(() => {
    if (searchTerm === "") {
      return stockData
    } else {
      return stockData.filter((item) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    }
  }, [searchTerm, stockData])

  const memoizedGroupedData = useMemo(() => {
    return groupStockData(memoizedFilteredData)
  }, [memoizedFilteredData, groupStockData])

  useEffect(() => {
    setFilteredData(memoizedFilteredData)
    setGroupedData(memoizedGroupedData)
  }, [memoizedFilteredData, memoizedGroupedData])

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const getGroupStats = (groupData) => {
    const totalItems = groupData.length
    let totalValue = 0

    groupData.forEach((item) => {
      const price = Number.parseFloat(item.standardPrice || 0)
      totalValue += isNaN(price) ? 0 : price
    })

    return { totalItems, totalValue }
  }

  const getConnectionIcon = () => {
    if (connectionStatus.tally.connected) {
      return <Wifi className="w-4 h-4 text-green-500" />
    } else if (connectionStatus.database.connected) {
      return <Database className="w-4 h-4 text-blue-500" />
    } else {
      return <WifiOff className="w-4 h-4 text-red-500" />
    }
  }

  const getConnectionStatus = () => {
    if (connectionStatus.tally.connected) {
      return { text: "Tally Connected", color: "text-green-600" }
    } else if (connectionStatus.database.connected && connectionStatus.database.totalItems > 0) {
      return { text: "Database Mode", color: "text-blue-600" }
    } else {
      return { text: "Offline", color: "text-red-600" }
    }
  }

  const getDataSourceBadge = () => {
    const badges = {
      TALLY: { text: "Live", color: "bg-green-100 text-green-800", icon: <Wifi className="w-3 h-3" /> },
      DATABASE: { text: "Cached", color: "bg-blue-100 text-blue-800", icon: <Database className="w-3 h-3" /> },
      CACHE: { text: "Offline", color: "bg-gray-100 text-gray-800", icon: <WifiOff className="w-3 h-3" /> },
    }

    const badge = badges[dataSource] || badges["CACHE"]

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        <span>{badge.text}</span>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Tally Stock Rates</h1>

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {getConnectionIcon()}
                <span className={`text-sm font-medium ${getConnectionStatus().color}`}>
                  {getConnectionStatus().text}
                </span>
              </div>

              {/* Data Source Badge */}
              {dataSource && getDataSourceBadge()}

              {/* Last Updated */}
              {lastUpdated && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Updated: {lastUpdated}</span>
                </div>
              )}

              {/* Sync Status */}
              {syncStatus.lastSync && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {syncStatus.syncStatus === "SYNCED" ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  )}
                  <span>Sync: {new Date(syncStatus.lastSync.time).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Sync Button */}
              <button
                onClick={performManualSync}
                disabled={syncing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Database className={`w-4 h-4 ${syncing ? "animate-pulse" : ""}`} />
                <span>{syncing ? "Syncing..." : "Sync Now"}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchStockRates}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Loading..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Status Bar */}
        {(connectionStatus.database.connected || dataSource) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Database: {connectionStatus.database.totalItems} items stored
                  </span>
                </div>
                {connectionStatus.database.lastSync && (
                  <span className="text-blue-600">
                    Last sync: {new Date(connectionStatus.database.lastSync).toLocaleString()}
                  </span>
                )}
              </div>
              {!connectionStatus.tally.connected && stockData.length > 0 && (
                <span className="text-amber-600 font-medium">
                  Tally offline - showing cached data ({stockData.length} items)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredData.length} of {stockData.length} items
          </div>
        )}

        {/* Stock Groups */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="flex items-center justify-center space-x-3">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-gray-600">Loading stock rates...</span>
              </div>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-600">
                {searchTerm
                  ? `No items found matching "${searchTerm}"`
                  : connectionStatus.database.connected && connectionStatus.database.totalItems > 0
                    ? "Database has items but failed to load. Try refreshing."
                    : 'No stock data available. Click "Refresh" or "Sync Now" to load data.'}
              </div>
              {!connectionStatus.tally.connected && connectionStatus.database.totalItems === 0 && (
                <div className="mt-2 text-sm text-amber-600">Tally is disconnected and no cached data available.</div>
              )}
            </div>
          ) : (
            Object.entries(groupedData)
              .sort(([a], [b]) => a.localeCompare(b)) // Sort parent groups A-to-Z
              .map(([groupName, groupData]) => {
                const groupStats = getGroupStats(groupData)
                const isGroupExpanded = expandedGroups[groupName]

                return (
                  <div key={groupName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Parent Group Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors border-b border-gray-100"
                      onClick={() => toggleGroup(groupName)}
                    >
                      <div className="flex items-center space-x-3">
                        {isGroupExpanded ? (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {groupName.trim() === "" || groupName === "UNCATEGORIZED"
                              ? "OFFLINE SAVED STOCK ITEM"
                              : groupName}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {groupStats.totalItems} items • Avg Rate: ₹
                            {(groupStats.totalValue / groupStats.totalItems || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">₹{groupStats.totalValue.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{groupStats.totalItems} items</div>
                      </div>
                    </div>

                    {/* Products List */}
                    {isGroupExpanded && (
                      <div className="p-4">
                        <div className="overflow-x-auto rounded-md border border-gray-200">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                                  #
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[200px]">
                                  Product Name
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                                  HSN Code
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-20">
                                  Unit
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                                  Rate
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[200px]">
                                  Manual Fields & Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {groupData.map((item, index) => (
                                <tr key={item.originalIndex} className="hover:bg-blue-50 transition-colors">
                                  <td className="px-3 py-2 text-sm text-gray-500 font-medium">{index + 1}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-start space-x-2">
                                      <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-gray-900 break-words">
                                          {formatValue(item.name)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {item.hsnCode ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono bg-blue-50 text-blue-800 border border-blue-200">
                                        {item.hsnCode}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {getUnit(item)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                      <DollarSign className="w-3 h-3 text-green-500" />
                                      <span className="text-sm font-semibold text-gray-900">
                                        ₹{formatCurrency(item.standardPrice)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="space-y-2">
                                      {/* Manual Fields Display */}
                                      <div className="flex flex-wrap items-center gap-1">
                                        {/* Grand Group Badge */}
                                        {item.grandGroup && item.grandGroup.trim() !== "" ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                            <Users className="w-3 h-3 mr-1" />
                                            {item.grandGroup}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                            <Users className="w-3 h-3 mr-1" />
                                            No Group
                                          </span>
                                        )}

                                        {/* Warranty Badge */}
                                        {item.warranty && item.warranty.trim() !== "" ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                            <Shield className="w-3 h-3 mr-1" />
                                            {item.warranty}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                            <Shield className="w-3 h-3 mr-1" />
                                            No Warranty
                                          </span>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleEditClick(item)}
                                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors border border-purple-200"
                                          title="Edit Grand Group & Warranty"
                                        >
                                          <Edit className="w-3 h-3" />
                                          <span>Edit Fields</span>
                                        </button>
                                        
                                        <button
                                          onClick={() => handleImageClick(item)}
                                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-200"
                                          title="Manage Images"
                                        >
                                          <ImageIcon className="w-3 h-3" />
                                          <span>Images</span>
                                          {itemImages[item.id] && itemImages[item.id].length > 0 && (
                                            <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-green-500 rounded-full">
                                              {itemImages[item.id].length}
                                            </span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>

        {/* Enhanced Summary Footer */}
        {stockData.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{stockData.length}</span> total items
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{Object.keys(groupedData).length}</span> groups
                </div>
                {/* Manual Fields Stats */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-purple-600">
                    {stockData.filter(item => item.grandGroup && item.grandGroup.trim() !== "").length}
                  </span> with Grand Group
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">
                    {stockData.filter(item => item.warranty && item.warranty.trim() !== "").length}
                  </span> with Warranty
                </div>
                {syncStatus.pendingItems > 0 && (
                  <div className="text-sm text-amber-600">
                    <span className="font-medium">{syncStatus.pendingItems}</span> pending sync
                  </div>
                )}
                {dataSource && (
                  <div className="text-sm text-gray-600">
                    Source: <span className="font-medium">{dataSource}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  Total Value: ₹
                  {stockData.reduce((sum, item) => sum + (Number.parseFloat(item.standardPrice) || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  Avg: ₹
                  {(
                    stockData.reduce((sum, item) => sum + (Number.parseFloat(item.standardPrice) || 0), 0) /
                      stockData.length || 0
                  ).toFixed(2)}{" "}
                  per item
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Manual Fields</h3>
              <button
                onClick={() => {
                  setShowFieldEditor(false)
                  setEditingItem(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-start space-x-2">
                  <Package className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {editingItem.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ID: {editingItem.id} | Parent: {editingItem.parent || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Grand Group</span>
                      <span className="text-xs text-gray-500">(Manual Field)</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={fieldUpdates.grandGroup}
                    onChange={(e) => setFieldUpdates(prev => ({ ...prev, grandGroup: e.target.value }))}
                    placeholder="Enter grand group category..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {editingItem.grandGroup || "Not set"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Warranty</span>
                      <span className="text-xs text-gray-500">(Manual Field)</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={fieldUpdates.warranty}
                    onChange={(e) => setFieldUpdates(prev => ({ ...prev, warranty: e.target.value }))}
                    placeholder="Enter warranty details (e.g., 1 Year, 6 Months)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {editingItem.warranty || "Not set"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowFieldEditor(false)
                  setEditingItem(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => updateManualFields(editingItem.id, fieldUpdates.grandGroup, fieldUpdates.warranty)}
                disabled={updatingFields}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
              >
                <Save className={`w-4 h-4 ${updatingFields ? "animate-pulse" : ""}`} />
                <span>{updatingFields ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium">Important Note:</p>
                  <p>These manual fields are stored separately and won't be overwritten during Tally sync. They help you organize and categorize your inventory beyond Tally's standard fields.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUpload && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Images for {selectedItem.name}</h3>
              <button
                onClick={() => {
                  setShowImageUpload(false)
                  setSelectedItem(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files, selectedItem.id)}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImages}
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploadingImages ? "Uploading..." : "Click to upload images or drag and drop"}
                  </span>
                  <span className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</span>
                </label>
              </div>
            </div>

            {/* Existing Images */}
            {itemImages[selectedItem.id] && itemImages[selectedItem.id].length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Existing Images ({itemImages[selectedItem.id].length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {itemImages[selectedItem.id].map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`http://localhost:8000${image.url}`}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                          <button
                            onClick={() => setPrimaryImage(selectedItem.id, image.url)}
                            className="p-1 bg-white rounded-full text-yellow-600 hover:text-yellow-700"
                            title="Set as primary"
                          >
                            <Star className={`w-4 h-4 ${image.isPrimary ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={() => deleteImage(selectedItem.id, image.url)}
                            className="p-1 bg-white rounded-full text-red-600 hover:text-red-700"
                            title="Delete image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TallyStockDashboard