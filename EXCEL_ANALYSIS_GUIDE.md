# 📊 Excel Report Guide & Statistical Analysis
*Understanding your video analysis results and statistical calculations*

---

## 📋 **What This Guide Covers**

This guide explains everything about the Excel reports generated by the Video Analysis Application:
- 📊 **Excel file structure** and what each sheet contains
- 📝 **Column terminology** and definitions  
- 🧮 **Statistical calculations** with step-by-step examples
- 📈 **Charts and visualizations** interpretation
- 🎯 **Real-world applications** for research and analysis

---

## 📁 **Excel File Structure**

When you export your analysis, you get a comprehensive Excel file with multiple sheets:

```
📊 video_analysis_20241203_143022.xlsx
├── 📋 Detection Data        # Raw detection results
├── 📈 Statistical Summary   # Key metrics and calculations  
├── 📊 Detection Charts      # Visual analysis charts
├── ⏱️ Timeline Analysis     # Time-based patterns
└── 📄 Video Metadata       # Original video information
```

---

## 📋 **Sheet 1: Detection Data**

This is the main data sheet containing every unique detection found in your video.

### **Column Definitions**

| Column | Description | Example | Purpose |
|--------|-------------|---------|---------|
| **Detection ID** | Unique identifier for each detection | `det_001`, `det_042` | Track individual detections |
| **Frame Number** | Video frame where detection occurred | `1247`, `2890` | Locate exact moment in video |
| **Timestamp** | Time in video when detected | `00:01:23.456` | Human-readable time reference |
| **Timestamp (Seconds)** | Time in decimal seconds | `83.456` | Mathematical calculations |
| **AI Prediction** | What the AI model detected | `car`, `bicycle` | Original AI classification |
| **AI Confidence** | How confident AI was (0-1) | `0.87`, `0.93` | AI certainty level |
| **User Choice** | What human reviewer selected | `motorcycle`, `taxi` | Final verified classification |
| **Bbox X** | Left edge of detection box (pixels) | `245` | Horizontal position |
| **Bbox Y** | Top edge of detection box (pixels) | `156` | Vertical position |
| **Bbox Width** | Width of detection box (pixels) | `120` | Object width |
| **Bbox Height** | Height of detection box (pixels) | `89` | Object height |
| **Manual Correction** | Was a different AI suggestion chosen? | `Yes`, `No` | User chose different AI option (not top choice) |
| **Manual Label** | Was this a custom input or non-AI choice? | `Yes`, `No` | Custom text or choice not in current AI suggestions |
| **Processed At** | When analysis was completed | `2024-12-03 14:30:22` | Processing timestamp |

### **Example Detection Data**

```
Detection ID: det_001
Frame Number: 1247
Timestamp: 00:00:41.567
AI Prediction: car
AI Confidence: 0.87
User Choice: car
Bbox X: 245, Y: 156, Width: 120, Height: 89
Manual Correction: No
```

**What this means:** At 41.567 seconds into the video, the AI detected a car with 87% confidence at position (245,156) with size 120×89 pixels. The human reviewer agreed it was a car.

### **🎨 Enhanced Visual Indicators & Excel Data Consistency**

The application now features enhanced visual indicators that are accurately reflected in Excel exports:

#### **📊 Manual Correction vs Manual Label Logic**

**🟠 Manual Correction (Orange):**
- **Definition**: User chose a different AI suggestion (not the top choice)
- **Excel**: Manual Correction = "Yes", Manual Label = "No"
- **Example**: AI suggests ["car", "truck", "bus"], user chooses "truck"

**🟣 Manual Label (Purple):**
- **Definition**: Custom user input OR choice not in current AI suggestions  
- **Excel**: Manual Label = "Yes", Manual Correction = "No"
- **Examples**: 
  - User types "electric scooter"
  - Resume case: User previously chose "taxi", but current AI suggests ["car", "bike"]

**🟢 AI Accepted (Green):**
- **Definition**: User accepted the top AI suggestion
- **Excel**: Manual Correction = "No", Manual Label = "No"
- **Example**: AI suggests ["car", "truck", "bus"], user chooses "car"

#### **📈 Excel Export Accuracy**

| User Action | Choice | Manual Label | Manual Correction | Visual Indicator |
|-------------|--------|--------------|-------------------|-----------------|
| **Types "electric scooter"** | electric scooter | **Yes** | No | 🟣 Purple |
| **AI: ["car","truck"], picks "truck"** | truck | No | **Yes** | 🟠 Orange |
| **AI: ["car","truck"], picks "car"** | car | No | No | 🟢 Green |
| **Resume: "taxi", AI: ["car","bike"]** | taxi | **Yes** | No | 🟣 Purple |

#### **🔄 Resume Functionality Impact**

When resuming from Excel exports, the visual indicators are accurately restored based on the Excel data:
- **Manual Label = "Yes"** → 🟣 Purple indicator
- **Manual Correction = "Yes"** → 🟠 Orange indicator  
- **Both = "No"** → 🟢 Green indicator
- **No User Choice** → ⚪ Gray indicator

---

## 📈 **Sheet 2: Statistical Summary**

### **2.1 Detection Counts**

**Total Unique Detections**
- **Definition**: Number of distinct vehicles detected
- **Calculation**: Count of rows in Detection Data sheet
- **Example**: 247 detections
- **Use**: Overall activity level

**Detections by Vehicle Type**
```
Cars: 156 (63.2%)
Motorcycles: 47 (19.0%)  
Bicycles: 31 (12.6%)
Trucks: 9 (3.6%)
Buses: 4 (1.6%)
```

**How calculated:**
```sql
-- Pseudocode for each vehicle type
Car_Count = COUNT(WHERE User_Choice = 'car')
Car_Percentage = (Car_Count / Total_Detections) × 100
```

### **2.2 AI Performance Metrics**

**Overall AI Accuracy**
- **Definition**: Percentage of AI predictions that humans agreed with
- **Calculation**: `(Correct Predictions ÷ Total Predictions) × 100`
- **Example**: `(198 ÷ 247) × 100 = 80.2%`

```
Calculation Example:
├── Total AI Predictions: 247
├── Human Agreed (AI Accepted - Green): 198  
├── Human Chose Different AI Option (Manual Correction - Orange): 32
├── Human Used Custom/Non-AI Choice (Manual Label - Purple): 17
└── AI Accuracy: 198/247 = 80.2%
```

**AI Confidence Analysis**
```
High Confidence (>80%): 189 detections (76.5%)
Medium Confidence (60-80%): 42 detections (17.0%)
Low Confidence (<60%): 16 detections (6.5%)
Average Confidence: 0.847 (84.7%)
```

**Confidence by Vehicle Type**
```
Cars: Average 0.89 confidence (most reliable)
Bicycles: Average 0.72 confidence (challenging)
Motorcycles: Average 0.81 confidence (good)
```

### **2.3 Temporal Analysis**

**Detection Density**
- **Definition**: How many vehicles detected per unit time
- **Formula**: `Total Detections ÷ Video Duration`
- **Example**: `247 detections ÷ 180 seconds = 1.37 detections/second`

**Peak Activity Periods**
```
Most Active Minute: 02:15-03:15 (23 detections)
Least Active Minute: 07:45-08:45 (2 detections)
Average per Minute: 8.2 detections
```

**How calculated:**
1. Group detections by 60-second windows
2. Count detections in each window
3. Find maximum, minimum, and average

### **2.4 Spatial Analysis**

**Detection Distribution**
- **Left Side (X < 50%)**: 118 detections (47.8%)
- **Right Side (X ≥ 50%)**: 129 detections (52.2%)
- **Top Half (Y < 50%)**: 89 detections (36.0%)
- **Bottom Half (Y ≥ 50%)**: 158 detections (64.0%)

**Average Object Sizes**
```
Cars: 145×98 pixels (average)
Motorcycles: 78×65 pixels
Bicycles: 52×71 pixels
Trucks: 201×134 pixels
Buses: 267×156 pixels
```

---

## 📊 **Sheet 3: Detection Charts**

### **3.1 Vehicle Type Distribution (Pie Chart)**
Shows percentage breakdown of all detected vehicles.

**How to read:**
- Larger slices = more common vehicle types
- Percentages add up to 100%
- Colors help distinguish vehicle types

**Example interpretation:**
```
🚗 Cars (63.2%) - Dominant vehicle type
🏍️ Motorcycles (19.0%) - Secondary traffic
🚴 Bicycles (12.6%) - Moderate bike activity
🚛 Trucks (3.6%) - Light commercial traffic  
🚌 Buses (1.6%) - Minimal public transport
```

### **3.2 AI Confidence Distribution (Histogram)**
Shows how confident the AI was across all detections.

**How to read:**
- X-axis: Confidence levels (0-1 or 0-100%)
- Y-axis: Number of detections
- Peak locations show most common confidence levels

**Example interpretation:**
```
Peak at 85-90%: AI was very confident about most detections
Few detections <50%: AI rarely made uncertain predictions
Long tail 90-100%: Many near-perfect confidence scores
```

### **3.3 Timeline Detection Rate (Line Chart)**
Shows detection activity over video duration.

**How to read:**
- X-axis: Time in video (seconds or MM:SS)
- Y-axis: Number of detections per time window
- Peaks = busy periods, valleys = quiet periods

**Example interpretation:**
```
Peak at 2:30: Traffic jam or busy intersection
Valley at 7:00: Low traffic period
Steady 4-6/minute: Normal traffic flow
```

### **3.4 Vehicle Size Analysis (Scatter Plot)**
Shows relationship between object width and height.

**How to read:**
- Each dot = one detection
- X-axis: Object width (pixels)
- Y-axis: Object height (pixels)
- Clusters show typical sizes for each vehicle type

---

## ⏱️ **Sheet 4: Timeline Analysis**

### **4.1 Time-Based Metrics**

**Detection Rate Over Time**
```
Time Window: Every 30 seconds
00:00-00:30: 12 detections (0.40/second)
00:30-01:00: 18 detections (0.60/second)
01:00-01:30: 8 detections (0.27/second)
...
```

**Calculation method:**
1. Divide video into equal time windows (30 seconds each)
2. Count detections in each window
3. Calculate rate = detections ÷ window duration

**Vehicle Type Timeline**
Shows when different vehicle types appeared:
```
Cars: Consistent throughout video
Motorcycles: Peak during 2:00-4:00
Bicycles: Most active 1:00-2:00 and 5:00-6:00
Trucks: Sporadic, mainly 3:00-4:00
```

### **4.2 Traffic Flow Analysis**

**Direction Analysis**
Based on object movement between frames:
```
Left-to-Right Movement: 142 vehicles (57.5%)
Right-to-Left Movement: 105 vehicles (42.5%)
Net Flow: 37 more vehicles left-to-right
```

**Speed Estimation**
Estimated from object position changes:
```
Average Speed: 24 pixels/frame = ~45 km/h*
Fastest Detection: 67 pixels/frame = ~125 km/h*
Slowest Detection: 3 pixels/frame = ~6 km/h*

*Speed estimates require calibration for accuracy
```

---

## 📄 **Sheet 5: Video Metadata**

### **5.1 Video Properties**

| Property | Value | Purpose |
|----------|-------|---------|
| **Filename** | traffic_video.mp4 | Source identification |
| **Duration** | 180.45 seconds | Total analysis time |
| **Resolution** | 1920×1080 pixels | Image quality context |
| **Frame Rate** | 30.0 FPS | Temporal resolution |
| **Total Frames** | 5,414 frames | Processing scope |
| **File Size** | 245.7 MB | Storage information |

### **5.2 Processing Parameters**

| Parameter | Value | Impact |
|-----------|-------|---------|
| **AI Model** | YOLOv8m | Detection accuracy |
| **Confidence Threshold** | 0.50 | Detection sensitivity |
| **Frame Skip** | 30 | Processing speed/detail tradeoff |
| **Detection Mode** | All Vehicles | Types of objects detected |
| **Processing Date** | 2024-12-03 14:30:22 | Analysis timestamp |

---

## 🧮 **Detailed Statistical Calculations**

### **Example 1: AI Accuracy Calculation**

**Sample Data:**
```
Total Detections: 100
AI Predicted "car", Human agreed "car": 67
AI Predicted "car", Human chose "truck": 8  
AI Predicted "motorcycle", Human agreed "motorcycle": 15
AI Predicted "bicycle", Human chose "motorcycle": 3
AI Predicted "truck", Human agreed "truck": 7
```

**Step-by-step calculation:**
```
Correct Predictions = 67 + 15 + 7 = 89
Total Predictions = 100
AI Accuracy = (89 ÷ 100) × 100 = 89.0%
```

### **Example 2: Detection Density Analysis**

**Sample Video:**
- Duration: 5 minutes (300 seconds)
- Total Detections: 150

**Calculations:**
```
Overall Density = 150 ÷ 300 = 0.5 detections/second

Per-Minute Analysis:
Minute 1 (0-60s): 45 detections = 0.75/second
Minute 2 (60-120s): 32 detections = 0.53/second  
Minute 3 (120-180s): 28 detections = 0.47/second
Minute 4 (180-240s): 23 detections = 0.38/second
Minute 5 (240-300s): 22 detections = 0.37/second

Peak Period: Minute 1 (0.75/second)
Quiet Period: Minute 5 (0.37/second)
```

### **Example 3: Vehicle Size Analysis**

**Sample Data for Cars:**
```
Detection 1: 145×98 pixels
Detection 2: 132×89 pixels  
Detection 3: 156×105 pixels
Detection 4: 128×87 pixels
Detection 5: 149×96 pixels
```

**Statistical Calculations:**
```
Average Width = (145+132+156+128+149) ÷ 5 = 142.0 pixels
Average Height = (98+89+105+87+96) ÷ 5 = 95.0 pixels

Standard Deviation Width:
1. Differences from mean: [3, -10, 14, -14, 7]
2. Squared differences: [9, 100, 196, 196, 49]
3. Variance = (9+100+196+196+49) ÷ 5 = 110
4. Std Dev = √110 = 10.5 pixels

Typical Car Size: 142±11 × 95±8 pixels
```

---

## 📊 **How to Interpret Results for Research**

### **Traffic Flow Studies**

**Question:** "How busy is this intersection during rush hour?"
**Look for:**
- Detection density (detections/minute)
- Peak activity periods
- Vehicle type distribution

**Example interpretation:**
```
Peak Hour (7:00-8:00 AM): 2.3 vehicles/second
Off-Peak (2:00-3:00 PM): 0.8 vehicles/second
Rush hour is 2.9× busier than off-peak periods
```

### **Transportation Mode Analysis**

**Question:** "What percentage of traffic is bicycles vs cars?"
**Look for:**
- Vehicle type distribution percentages
- Temporal patterns by vehicle type
- AI confidence levels for each type

**Example interpretation:**
```
Cars: 68% of traffic (consistent throughout day)
Bicycles: 15% of traffic (peak 7-9 AM, 5-7 PM)
This suggests significant bicycle commuting activity
```

### **AI Performance Evaluation**

**Question:** "How reliable is the AI detection?"
**Look for:**
- Overall AI accuracy percentage
- Confidence distribution
- Manual correction vs manual label rates
- Visual indicator breakdown

**Enhanced interpretation with visual indicators:**
```
Overall Accuracy: 87%
High Confidence (>80%): 78% of detections
🟢 AI Accepted (Green): 74% of detections
🟠 Manual Corrections (Orange): 13% of detections  
🟣 Manual Labels (Purple): 13% of detections
The AI is highly reliable, with most corrections being re-ranking rather than completely new categories
```

**Key insights from corrected data:**
- **Low Orange %**: AI suggestions are generally good, users just prefer different rankings
- **High Purple %**: Users frequently identify vehicle types the AI doesn't recognize
- **High Green %**: AI top suggestions are trusted by users

### **Infrastructure Planning**

**Question:** "Do we need a bigger road?"
**Look for:**
- Detection density trends
- Vehicle size analysis
- Traffic flow patterns

**Example interpretation:**
```
Peak Density: 3.2 vehicles/second
Large Vehicles (trucks/buses): 8% of traffic
Bidirectional Flow: 55% left-to-right, 45% right-to-left
Current infrastructure appears adequate
```

---

## 📈 **Chart Reading Guide**

### **Pie Charts (Vehicle Distribution)**
- **Large slices**: Dominant vehicle types
- **Small slices**: Rare vehicle types  
- **Colors**: Help distinguish categories
- **Percentages**: Exact proportions

### **Bar Charts (Counts by Category)**
- **Height**: Number of detections
- **Categories**: Different vehicle types
- **Colors**: Visual distinction
- **Values**: Exact counts on bars

### **Line Charts (Time Series)**
- **X-axis**: Time progression
- **Y-axis**: Detection count/rate
- **Peaks**: High activity periods
- **Valleys**: Low activity periods
- **Trends**: Overall patterns

### **Scatter Plots (Size Analysis)**
- **Each dot**: One detection
- **Clusters**: Similar-sized objects
- **Outliers**: Unusually large/small objects
- **Patterns**: Relationships between width/height

---

## 🎯 **Common Use Cases**

### **1. Academic Research**
```
Research Question: "Urban bicycle usage patterns"
Relevant Metrics:
- Bicycle detection percentage
- Temporal distribution of bicycles
- AI confidence for bicycle detection
- Bicycle size consistency
```

### **2. Traffic Engineering**
```
Engineering Goal: "Intersection optimization"
Relevant Metrics:
- Peak hour detection rates
- Vehicle type distribution
- Traffic flow direction analysis
- Detection density over time
```

### **3. AI Model Validation**
```
Validation Purpose: "Computer vision accuracy"
Relevant Metrics:
- AI accuracy percentage
- Confidence distribution
- Manual correction rates
- Performance by vehicle type
```

### **4. Urban Planning**
```
Planning Question: "Mixed-use transportation needs"
Relevant Metrics:
- Multi-modal transportation percentages
- Peak usage periods by vehicle type
- Infrastructure capacity analysis
- Temporal usage patterns
```

---

## 💡 **Tips for Better Analysis**

### **Data Quality Indicators**

**High Quality Data:**
- ✅ AI accuracy >85%
- ✅ Few manual corrections (<15%)
- ✅ High confidence scores (>80% average)
- ✅ Consistent object sizes within types

**Lower Quality Data:**
- ⚠️ AI accuracy <70%
- ⚠️ Many manual corrections (>25%)
- ⚠️ Low confidence scores (<60% average)
- ⚠️ Highly variable object sizes

### **Statistical Significance**

**Minimum Sample Sizes:**
- Basic analysis: 50+ detections
- Vehicle type comparison: 20+ per type
- Temporal analysis: 30+ time windows
- Accuracy assessment: 100+ detections

### **Interpretation Cautions**

**Remember:**
- AI confidence ≠ actual accuracy
- Small samples have high variability
- Video quality affects detection quality
- Frame skip affects temporal precision
- Object size depends on camera distance

---

## 📚 **Glossary of Terms**

### **AI/Computer Vision Terms**

| Term | Definition | Example |
|------|------------|---------|
| **Bounding Box** | Rectangle around detected object | (x=245, y=156, w=120, h=89) |
| **Confidence Score** | AI certainty level (0-1) | 0.87 = 87% confident |
| **IoU (Intersection over Union)** | Overlap measurement for tracking | 0.6 = 60% overlap |
| **Frame Skip** | Process every Nth frame | Skip=30 means every 30th frame |
| **NMS (Non-Maximum Suppression)** | Remove duplicate detections | Prevents double-counting |

### **Statistical Terms**

| Term | Definition | Formula |
|------|------------|---------|
| **Mean** | Average value | Sum ÷ Count |
| **Standard Deviation** | Data spread measurement | √(Σ(x-μ)²/n) |
| **Percentile** | Value below which % of data falls | 90th percentile = 90% below |
| **Correlation** | Relationship strength | -1 to +1 |
| **Distribution** | How values are spread | Normal, uniform, skewed |

### **Transportation Terms**

| Term | Definition | Context |
|------|------------|---------|
| **Detection Density** | Objects per unit time | Vehicles/second |
| **Modal Split** | Transportation mode percentages | 60% cars, 40% bikes |
| **Traffic Flow** | Movement direction analysis | Left-to-right vs right-to-left |
| **Peak Hour** | Highest activity period | Rush hour traffic |
| **Occupancy** | Space utilization | Vehicles per road area |

---

## 🆘 **Getting Help with Analysis**

### **Common Questions**

**Q: "My AI accuracy is only 65%. Is this normal?"**
A: This depends on video quality and content. For traffic videos with good lighting, expect 80-90%. Poor weather, night videos, or unusual angles can reduce accuracy.

**Q: "Why are there so few bicycle detections?"**
A: Bicycles are smaller and harder to detect. Check if the confidence threshold is too high, or if bicycles are actually present in the video.

**Q: "The vehicle counts seem too low."**
A: Check the frame skip setting. If processing every 30th frame, you might miss vehicles that appear briefly.

### **Data Validation Checklist**

Before drawing conclusions:
- ✅ Watch sample video segments to verify detection quality
- ✅ Check if AI predictions match your visual assessment  
- ✅ Verify vehicle type classifications make sense
- ✅ **Verify Manual Correction vs Manual Label columns are accurate**
- ✅ **Check visual indicator consistency when resuming from Excel**
- ✅ Look for systematic biases (e.g., missing small objects)
- ✅ Compare results with manual counts on short segments
- ✅ **Ensure Orange indicators represent AI re-ranking, Purple represents new categories**

---

**📊 Happy Data Analysis! Your Excel reports contain rich insights about transportation patterns and AI performance! 🚗📈**

*Built to make complex AI analysis accessible to researchers, students, and transportation professionals*
