import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Package, Building2, Tag, Search, RefreshCw, DollarSign, AlertTriangle } from "lucide-react"

const TallyStockDashboard = () => {
  const [stockData, setStockData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [groupedData, setGroupedData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedGroups, setExpandedGroups] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})
  const [parsingIssues, setParsingIssues] = useState([])

  const API_BASE = "https://invoice-56iv.onrender.com/api/tally"

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      setIsConnected(response.ok)
    } catch (err) {
      setIsConnected(false)
    }
  }

  // Enhanced price parsing function - try multiple rate fields
  const parsePrice = (item, itemName, fieldType) => {
    const issues = []
    let value = 0
    let unit = "Pcs"
    let fieldUsed = 'none'
    
    try {
      // Try multiple fields in priority order for current rates
      const priceFields = fieldType === 'price' 
        ? ['RATE', 'SALESRATE', 'LISTPRICE', 'STANDARDPRICE', 'BASICRATE', 'PRICE', 'MRP']
        : ['STANDARDCOST', 'PURCHASERATE', 'COST', 'AVGCOST', 'LASTPURCHASERATE']
      
      let priceData = null
      
      // Find the first available price field
      for (const field of priceFields) {
        if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
          priceData = item[field]
          fieldUsed = field
          break
        }
      }
      
      if (!priceData) {
        // Log all available fields for debugging
        console.log(`No ${fieldType} field found for "${itemName}". Available fields:`, Object.keys(item))
        issues.push(`No ${fieldType} field found. Checked: ${priceFields.join(', ')}`)
        return { value: 0, unit: "Pcs", issues, fieldUsed: 'none' }
      }
      
      console.log(`Using ${fieldUsed} for ${itemName} ${fieldType}:`, JSON.stringify(priceData, null, 2))
      
      // Handle nested structure like {_: "149.00/Pcs", TYPE: "Rate"}
      if (typeof priceData === 'object' && priceData !== null) {
        let priceStr = null
        
        // Try different nested properties
        if (priceData._) {
          priceStr = priceData._
        } else if (priceData.VALUE) {
          priceStr = priceData.VALUE
        } else if (priceData.AMOUNT) {
          priceStr = priceData.AMOUNT
        } else if (priceData.RATE) {
          priceStr = priceData.RATE
        } else {
          // If it's an object but no recognized property, try to stringify and parse
          const objStr = JSON.stringify(priceData)
          console.log(`Unknown object structure for ${fieldUsed}:`, objStr)
          issues.push(`Unknown object structure for ${fieldUsed}: ${objStr}`)
          return { value: 0, unit: "Pcs", issues, fieldUsed }
        }
        
        console.log(`Parsing ${fieldType} for "${itemName}": "${priceStr}" from field: ${fieldUsed}`)
        
        // Extract price and unit from formats like "149.00/Pcs", "150.50/Kg", "45/Box"
        if (typeof priceStr === 'string') {
          const priceUnitMatch = priceStr.match(/^([\d.,]+)\s*\/\s*([A-Za-z]+)$/)
          if (priceUnitMatch) {
            value = parseFloat(priceUnitMatch[1].replace(/,/g, ''))
            unit = priceUnitMatch[2]
          } else {
            // Try to extract just the numeric value
            const numericMatch = priceStr.match(/([\d.,]+)/)
            if (numericMatch) {
              value = parseFloat(numericMatch[1].replace(/,/g, ''))
              // Try to guess unit from the string
              const unitMatch = priceStr.match(/\/([A-Za-z]+)/)
              if (unitMatch) {
                unit = unitMatch[1]
              }
            } else {
              issues.push(`Could not parse ${fieldType} from ${fieldUsed}: "${priceStr}"`)
            }
          }
        } else if (typeof priceStr === 'number') {
          value = priceStr
        }
      }
      // Handle direct numeric values
      else if (typeof priceData === 'number') {
        value = priceData
        console.log(`Direct numeric value for ${itemName} ${fieldType}: ${value}`)
      }
      // Handle string numeric values
      else if (typeof priceData === 'string') {
        console.log(`String value for ${itemName} ${fieldType}: "${priceData}"`)
        
        // Handle formats like "149.00/Pcs", "150.50/Kg", "45/Box"
        const priceUnitMatch = priceData.match(/^([\d.,]+)\s*\/\s*([A-Za-z]+)$/)
        if (priceUnitMatch) {
          value = parseFloat(priceUnitMatch[1].replace(/,/g, ''))
          unit = priceUnitMatch[2]
        } else {
          // Try to extract just the numeric value
          const numericMatch = priceData.match(/([\d.,]+)/)
          if (numericMatch) {
            value = parseFloat(numericMatch[1].replace(/,/g, ''))
          } else {
            issues.push(`Could not parse ${fieldType} from ${fieldUsed}: "${priceData}"`)
          }
        }
      }
      
      if (isNaN(value)) {
        value = 0
        issues.push(`${fieldType} from ${fieldUsed} resulted in NaN`)
      }
      
      console.log(`Final parsed ${fieldType} for "${itemName}": ${value} ${unit} (from ${fieldUsed})`)
      
    } catch (err) {
      console.error(`Error parsing ${fieldType} for "${itemName}":`, err)
      issues.push(`Parse error for ${fieldType}: ${err.message}`)
      fieldUsed = 'error'
    }
    
    return { value, unit, issues, fieldUsed }
  }

  // Improved unit detection
  const detectUnit = (item) => {
    // Priority order: parsed unit from price > baseUnits > item name analysis > default
    
    // Check if we have a unit from price parsing
    if (item.priceUnit && item.priceUnit !== "Pcs") {
      return item.priceUnit
    }
    
    // Check baseUnits
    if (item.baseUnits && item.baseUnits !== "Pcs") {
      return item.baseUnits
    }
    
    // Analyze item name for unit hints
    const itemName = (item.name || "").toLowerCase()
    
    // Common unit patterns in item names
    const unitPatterns = [
      { pattern: /\bkg\b|\bkilogram\b/, unit: "Kg" },
      { pattern: /\bltr\b|\blitre\b|\bliter\b/, unit: "Ltr" },
      { pattern: /\bmtr\b|\bmeter\b|\bmetre\b/, unit: "Mtr" },
      { pattern: /\bft\b|\bfeet\b|\bfoot\b/, unit: "Ft" },
      { pattern: /\binch\b|\bin\b/, unit: "Inch" },
      { pattern: /\bmm\b|\bmillimeter\b/, unit: "MM" },
      { pattern: /\bcm\b|\bcentimeter\b/, unit: "CM" },
      { pattern: /\bbox\b|\bcarton\b/, unit: "Box" },
      { pattern: /\broll\b/, unit: "Roll" },
      { pattern: /\bsheet\b/, unit: "Sheet" },
      { pattern: /\bpair\b/, unit: "Pair" },
      { pattern: /\bset\b/, unit: "Set" },
      { pattern: /\bbag\b/, unit: "Bag" },
      { pattern: /\bpack\b|\bpacket\b/, unit: "Pack" }
    ]
    
    for (const { pattern, unit } of unitPatterns) {
      if (pattern.test(itemName)) {
        return unit
      }
    }
    
    return "Pcs" // Default fallback
  }

  const groupStockData = (data) => {
    const grouped = {}

    data.forEach((item, index) => {
      const productName = item.name || ""
      const lowerName = productName.toLowerCase()

      // Determine group (brand/manufacturer/material type)
      let group = "OTHER"
      if (lowerName.includes("cpvc")) group = "CPVC FITTINGS"
      else if (lowerName.includes("upvc")) group = "UPVC FITTINGS"
      else if (lowerName.includes("pvc") && !lowerName.includes("cpvc") && !lowerName.includes("upvc")) group = "PVC FITTINGS"
      else if (lowerName.includes("gi ") || lowerName.includes("galvanized")) group = "GI FITTINGS"
      else if (lowerName.includes("brass")) group = "BRASS FITTINGS"
      else if (lowerName.includes("ss ") || lowerName.includes("stainless")) group = "STAINLESS STEEL"
      else if (lowerName.includes("astral")) group = "ASTRAL"
      else if (lowerName.includes("aquasafe")) group = "AQUASAFE"
      else if (lowerName.includes("zoloto")) group = "ZOLOTO"
      else if (lowerName.includes("valve") || lowerName.includes("cock")) group = "VALVES & COCKS"
      else if (lowerName.includes("clamp") || lowerName.includes("grip") || lowerName.includes("bolt")) group = "CLAMPS & FASTENERS"
      else if (lowerName.includes("basin") || lowerName.includes("washbasin")) group = "SANITARYWARE"
      else if (lowerName.includes("shower") || lowerName.includes("spray")) group = "SHOWER FITTINGS"

      // Determine category based on product characteristics
      let category = "GENERAL"
      if (lowerName.includes("elbow") || lowerName.includes("bend")) category = "ELBOWS & BENDS"
      else if (lowerName.includes("tee")) category = "TEES"
      else if (lowerName.includes("coupling") || lowerName.includes("union")) category = "COUPLINGS & UNIONS"
      else if (lowerName.includes("reducer") || lowerName.includes("bushing") || lowerName.includes("adopter") || lowerName.includes("adaptor"))
        category = "REDUCERS & BUSHINGS"
      else if (lowerName.includes("end cap") || lowerName.includes("endcap") || lowerName.includes("plug"))
        category = "END CAPS & PLUGS"
      else if (lowerName.includes("valve") || lowerName.includes("cock") || lowerName.includes("nrv"))
        category = "VALVES & COCKS"
      else if (lowerName.includes("clamp") || lowerName.includes("grip") || lowerName.includes("bolt") || lowerName.includes("fastener"))
        category = "CLAMPS & FASTENERS"
      else if (lowerName.includes("fapt") || lowerName.includes("mapt") || lowerName.includes("fabt") || lowerName.includes("mabt"))
        category = "THREADED ADAPTERS"
      else if (lowerName.includes("pipe") && !lowerName.includes("coupling") && !lowerName.includes("clamp"))
        category = "PIPES & TUBES"
      else if (lowerName.includes("nipple"))
        category = "NIPPLES"
      else if (lowerName.includes("flange"))
        category = "FLANGES"
      else if (lowerName.includes("trap"))
        category = "TRAPS & DRAINS"

      // Initialize group if not exists
      if (!grouped[group]) {
        grouped[group] = {}
      }

      // Initialize category if not exists
      if (!grouped[group][category]) {
        grouped[group][category] = []
      }

      // Add item to category
      grouped[group][category].push({
        ...item,
        originalIndex: index,
      })
    })

    return grouped
  }

  const fetchStockRates = async () => {
    setLoading(true)
    setError("")
    setParsingIssues([])
    
    try {
      // Add parameters to fetch current/today's data
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const params = new URLSearchParams({
        date: today,
        refresh: 'true',
        includeRates: 'true',
        priceList: 'current', // or 'standard', 'retail', etc.
        timestamp: Date.now().toString() // Prevent caching
      })
      
      const response = await fetch(`${API_BASE}/stock-rates?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        setIsConnected(false)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("Full API Response:", JSON.stringify(result, null, 2))

      setIsConnected(true)

      // Try different possible response structures
      let stockItems = null
      
      // Structure 1: result.success && result.data && result.data.stockItems
      if (result.success && result.data && result.data.stockItems) {
        stockItems = result.data.stockItems
        console.log("Using structure 1: result.data.stockItems")
      }
      // Structure 2: Tally ENVELOPE structure (most likely based on your data)
      else if (result.success && result.data && result.data.data && result.data.data.ENVELOPE) {
        const envelope = result.data.data.ENVELOPE
        if (envelope.BODY && envelope.BODY.DATA && envelope.BODY.DATA.COLLECTION && envelope.BODY.DATA.COLLECTION.STOCKITEM) {
          stockItems = envelope.BODY.DATA.COLLECTION.STOCKITEM
          console.log("Using structure 2: Tally ENVELOPE.BODY.DATA.COLLECTION.STOCKITEM structure")
        } else if (envelope.BODY && envelope.BODY.DATA && envelope.BODY.DATA.COLLECTION) {
          stockItems = envelope.BODY.DATA.COLLECTION
          console.log("Using structure 2a: Tally ENVELOPE.BODY.DATA.COLLECTION structure")
        } else if (envelope.DATA && Array.isArray(envelope.DATA)) {
          stockItems = envelope.DATA
          console.log("Using structure 2b: ENVELOPE.DATA array")
        }
      }
      // Structure 3: Direct array in result.data
      else if (result.success && result.data && Array.isArray(result.data)) {
        stockItems = result.data
        console.log("Using structure 3: Direct array in result.data")
      }
      // Structure 4: result.stockItems directly
      else if (result.stockItems && Array.isArray(result.stockItems)) {
        stockItems = result.stockItems
        console.log("Using structure 4: result.stockItems")
      }
      // Structure 5: result is direct array
      else if (Array.isArray(result)) {
        stockItems = result
        console.log("Using structure 5: result is direct array")
      }

      console.log("Extracted stockItems:", stockItems)

      if (stockItems && Array.isArray(stockItems) && stockItems.length > 0) {
        const allParsingIssues = []
        
        // Transform the data to match our component structure
        const transformedData = stockItems.map((item, index) => {
          console.log(`Processing item ${index}:`, JSON.stringify(item, null, 2))
          
          const itemName = item.NAME || item.name || item.DSPDISPNAME || item.particulars || `Item ${index + 1}`
          
          // Handle BASEUNITS
          const baseUnits = item.BASEUNITS?._ || item.BASEUNITS || item.baseUnits || item.UNIT || item.unit || "Pcs"
          
          // Parse prices with enhanced field detection
          const priceResult = parsePrice(item, itemName, 'price')
          const costResult = parsePrice(item, itemName, 'cost')
          
          // Collect parsing issues
          const itemIssues = [...priceResult.issues, ...costResult.issues]
          if (itemIssues.length > 0) {
            allParsingIssues.push({
              itemName,
              index,
              issues: itemIssues
            })
          }
          
          const transformedItem = {
            name: itemName,
            baseUnits: baseUnits,
            standardPrice: priceResult.value,
            standardCost: costResult.value,
            priceUnit: priceResult.unit,
            costUnit: costResult.unit,
            priceFieldUsed: priceResult.fieldUsed,
            costFieldUsed: costResult.fieldUsed,
            index: index,
            rawPriceData: item[priceResult.fieldUsed] || item.STANDARDPRICE,
            rawCostData: item[costResult.fieldUsed] || item.STANDARDCOST,
            allFields: Object.keys(item), // Debug: show all available fields
            originalItem: item // Debug: keep original for inspection
          }
          
          // Detect the best unit to use
          transformedItem.displayUnit = detectUnit(transformedItem)
          
          console.log(`Transformed item ${index} "${itemName}":`, {
            standardPrice: transformedItem.standardPrice,
            standardCost: transformedItem.standardCost,
            priceFieldUsed: transformedItem.priceFieldUsed,
            costFieldUsed: transformedItem.costFieldUsed,
            priceUnit: transformedItem.priceUnit,
            displayUnit: transformedItem.displayUnit
          })
          
          return transformedItem
        })

        console.log("Transformed data:", transformedData)
        console.log("Parsing issues:", allParsingIssues)

        setStockData(transformedData)
        setFilteredData(transformedData)
        setGroupedData(groupStockData(transformedData))
        setParsingIssues(allParsingIssues)
        setLastUpdated(new Date().toLocaleString())
        setError("")
      } else {
        console.error("No valid stock items found in response")
        console.error("Available keys in result:", Object.keys(result))
        if (result.data) {
          console.error("Available keys in result.data:", Object.keys(result.data))
        }
        setError(`Failed to fetch stock rates: No stock items found. Response structure: ${JSON.stringify(Object.keys(result), null, 2)}`)
        setStockData([])
        setFilteredData([])
        setGroupedData({})
      }
    } catch (err) {
      setIsConnected(false)
      console.error("Fetch error:", err)
      setError(`Error fetching stock rates: ${err.message}`)
      setStockData([])
      setFilteredData([])
      setGroupedData({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
    fetchStockRates()
  }, [])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredData(stockData)
      setGroupedData(groupStockData(stockData))
    } else {
      const filtered = stockData.filter((item) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredData(filtered)
      setGroupedData(groupStockData(filtered))
    }
  }, [searchTerm, stockData])

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return ""
    }
    return String(value)
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "" || value === 0) {
      return "0.00"
    }
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) {
      return "0.00"
    }
    return numValue.toFixed(2)
  }

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") {
      return ""
    }
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) {
      return String(value)
    }
    return numValue.toString()
  }

  const getUnit = (item) => {
    return item.displayUnit || item.baseUnits || "Pcs"
  }

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const toggleCategory = (groupName, categoryName) => {
    const key = `${groupName}-${categoryName}`
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const getGroupStats = (groupData) => {
    let totalItems = 0
    let totalValue = 0

    Object.values(groupData).forEach((category) => {
      totalItems += category.length
      category.forEach((item) => {
        const price = Number.parseFloat(item.standardPrice || 0)
        totalValue += isNaN(price) ? 0 : price
      })
    })

    return { totalItems, totalValue }
  }

  const getCategoryStats = (categoryData) => {
    let totalValue = 0
    categoryData.forEach((item) => {
      const price = Number.parseFloat(item.standardPrice || 0)
      totalValue += isNaN(price) ? 0 : price
    })

    return { totalItems: categoryData.length, totalValue }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Tally Stock Rates</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-red-600"}`}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {lastUpdated && <span className="text-xs text-gray-500">Updated: {lastUpdated}</span>}
              {parsingIssues.length > 0 && (
                <div className="flex items-center space-x-1 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs">{parsingIssues.length} parsing issues</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Compact Search */}
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
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Parsing Issues Warning */}
        {parsingIssues.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Price Parsing Issues ({parsingIssues.length} items):</span>
                <div className="mt-1 text-xs max-h-20 overflow-y-auto">
                  {parsingIssues.slice(0, 3).map((issue, idx) => (
                    <div key={idx} className="mb-1">
                      <strong>{issue.itemName}:</strong> {issue.issues.join(", ")}
                    </div>
                  ))}
                  {parsingIssues.length > 3 && (
                    <div className="text-amber-600">...and {parsingIssues.length - 3} more items</div>
                  )}
                </div>
              </div>
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
                  : 'No stock data available. Click "Refresh" to load data.'}
              </div>
            </div>
          ) : (
            Object.entries(groupedData).map(([groupName, groupData]) => {
              const groupStats = getGroupStats(groupData)
              const isGroupExpanded = expandedGroups[groupName]

              return (
                <div key={groupName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Group Header - More Compact */}
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
                        <h2 className="text-lg font-semibold text-gray-900">{groupName}</h2>
                        <p className="text-sm text-gray-600">
                          {groupStats.totalItems} items • Avg Rate: ₹{(groupStats.totalValue / groupStats.totalItems || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">₹{groupStats.totalValue.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{groupStats.totalItems} items</div>
                    </div>
                  </div>

                  {/* Group Content */}
                  {isGroupExpanded && (
                    <div className="divide-y divide-gray-100">
                      {Object.entries(groupData).map(([categoryName, categoryData]) => {
                        const categoryStats = getCategoryStats(categoryData)
                        const categoryKey = `${groupName}-${categoryName}`
                        const isCategoryExpanded = expandedCategories[categoryKey]

                        return (
                          <div key={categoryName}>
                            {/* Category Header - Smaller */}
                            <div
                              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ml-6 mr-6 my-2 rounded-md"
                              onClick={() => toggleCategory(groupName, categoryName)}
                            >
                              <div className="flex items-center space-x-2">
                                {isCategoryExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                )}
                                <Tag className="w-3 h-3 text-gray-600" />
                                <div>
                                  <h3 className="text-sm font-medium text-gray-800">{categoryName}</h3>
                                  <p className="text-xs text-gray-500">
                                    {categoryStats.totalItems} items • Avg: ₹{(categoryStats.totalValue / categoryStats.totalItems || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-700">
                                  ₹{categoryStats.totalValue.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">{categoryStats.totalItems} items</div>
                              </div>
                            </div>

                            {/* Category Products - Compact Table */}
                            {isCategoryExpanded && (
                              <div className="mx-6 mb-4">
                                <div className="overflow-x-auto rounded-md border border-gray-200">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                                          #
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[300px]">
                                          Product Name
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-20">
                                          Unit
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                                          Standard Price
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                                          Standard Cost
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {categoryData.map((item, index) => {
                                        const hasParsingIssue = parsingIssues.some(issue => 
                                          issue.itemName === item.name
                                        )
                                        
                                        return (
                                          <tr 
                                            key={item.originalIndex} 
                                            className={`hover:bg-blue-50 transition-colors ${
                                              hasParsingIssue ? 'bg-amber-50' : ''
                                            }`}
                                          >
                                            <td className="px-3 py-2 text-sm text-gray-500 font-medium">
                                              {index + 1}
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-start space-x-2">
                                                <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                  <div className="text-sm font-medium text-gray-900 break-words">
                                                    {formatValue(item.name)}
                                                  </div>
                                                  {hasParsingIssue && (
                                                    <div className="flex items-center space-x-1 mt-1">
                                                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                      <span className="text-xs text-amber-600">Parsing issue</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
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
                                              {item.priceUnit && item.priceUnit !== getUnit(item) && (
                                                <div className="text-xs text-gray-500">
                                                  per {item.priceUnit}
                                                </div>
                                              )}
                                              {/* Debug info - show field used and raw data */}
                                              <div className="text-xs text-gray-400 mt-1">
                                                {item.priceFieldUsed && (
                                                  <div title="Field Used">
                                                    Field: {item.priceFieldUsed}
                                                  </div>
                                                )}
                                                {item.rawPriceData && (
                                                  <div title="Raw Tally Data">
                                                    Raw: {JSON.stringify(item.rawPriceData)}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              <div className="flex items-center justify-end space-x-1">
                                                <DollarSign className="w-3 h-3 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-700">
                                                  ₹{formatCurrency(item.standardCost)}
                                                </span>
                                              </div>
                                              {item.costUnit && item.costUnit !== getUnit(item) && (
                                                <div className="text-xs text-gray-500">
                                                  per {item.costUnit}
                                                </div>
                                              )}
                                              {/* Debug info - show field used and raw data */}
                                              <div className="text-xs text-gray-400 mt-1">
                                                {item.costFieldUsed && (
                                                  <div title="Field Used">
                                                    Field: {item.costFieldUsed}
                                                  </div>
                                                )}
                                                {item.rawCostData && (
                                                  <div title="Raw Tally Data">
                                                    Raw: {JSON.stringify(item.rawCostData)}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Summary Footer */}
        {stockData.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{stockData.length}</span> total items
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{Object.keys(groupedData).length}</span> groups
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {Object.values(groupedData).reduce((acc, group) => acc + Object.keys(group).length, 0)}
                  </span>{" "}
                  categories
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  Total Value: ₹
                  {stockData
                    .reduce((sum, item) => sum + (Number.parseFloat(item.standardPrice) || 0), 0)
                    .toFixed(2)}
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
    </div>
  )
}

export default TallyStockDashboard