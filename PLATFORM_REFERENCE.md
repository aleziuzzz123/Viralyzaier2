bsite https://github.com/shotstack/shotstack-studio-sdknd also please read
 # 🚀 Viralyzaier Platform - Complete Technical Reference

## 📋 **Platform Overview**

**Viralyzaier** is an AI-powered video creation platform that enables users to create viral videos from a simple prompt. The platform uses advanced AI models to generate scripts, create visual assets, edit videos professionally, analyze performance, and publish content across multiple platforms.

## 🎯 **Core Value Proposition**

Users can create viral videos by:
1. **Input a topic/prompt** → AI generates complete video blueprint
2. **AI generates script & visuals** → Professional video structure with moodboard
3. **Professional video editing** → Shotstack Studio integration for timeline editing
4. **AI analysis & optimization** → Performance scoring and recommendations
5. **One-click publishing** → Direct YouTube integration with SEO optimization

## 🏗️ **Architecture Overview**

### **Frontend Stack:**
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Supabase** for backend services
- **Shotstack Studio SDK** for video editing

### **AI Integration:**
- **Google Gemini 2.5 Flash** for script generation and analysis
- **Google Imagen 3.0** for image generation
- **ElevenLabs** for voiceover generation
- **RunwayML** for AI video generation

### **Backend Services:**
- **Supabase Edge Functions** for secure API proxying
- **Supabase Database** for project storage
- **Supabase Storage** for asset management

## 🔄 **Complete User Flow**

### **Stage 1: The Spark (ProjectKickoff)**
**Component:** `components/ProjectKickoff.tsx`

**Process:**
1. User enters a topic/prompt for their video
2. System validates input and checks user credits (1 credit required)
3. Creates new project with `workflowStep: 2`
4. Transitions to Blueprint generation

**Key Features:**
- Topic validation and error handling
- Credit consumption with upgrade prompts
- Project creation with initial metadata
- Seamless transition to next stage

### **Stage 2: The Blueprint (ScriptGenerator)**
**Component:** `components/ScriptGenerator.tsx`

**Process:**
1. **AI Script Generation** (5 credits)
   - Uses Google Gemini 2.5 Flash
   - Generates strategic summary, titles, and complete script
   - Supports multiple video styles (High-Energy Viral, Cinematic Documentary, Clean & Corporate)
   - Incorporates brand identity if available

2. **Visual Asset Generation**
   - Creates moodboard images using Google Imagen 3.0
   - Generates storyboard images for each scene
   - Uploads assets to Supabase Storage

3. **Voiceover Generation** (Optional)
   - Uses ElevenLabs for AI voiceover
   - Supports multiple voice options
   - Generates audio files for each scene

4. **Project Updates**
   - Saves complete script with scenes, hooks, and CTA
   - Stores moodboard and voiceover URLs
   - Updates project status and transitions to Creative Studio

**Key Features:**
- Multiple video styles and formats (16:9, 9:16, 1:1)
- Brand identity integration
- Real-time progress updates
- Comprehensive error handling
- Auto-save functionality

### **Stage 3: Creative Studio (CreativeStudio)**
**Component:** `components/CreativeStudio.tsx` + `components/StudioPage.tsx`

**Process:**
1. **Shotstack Studio Integration**
   - Loads professional video editor in iframe
   - Initializes with project data and assets
   - Provides timeline-based editing interface

2. **Asset Management**
   - Asset browser for stock footage, images, and audio
   - Integration with Pexels, Jamendo, and Giphy
   - AI-generated asset suggestions

3. **Professional Editing Tools**
   - Multi-track timeline (video, audio, graphics)
   - Real-time preview
   - Auto-save functionality
   - Professional transitions and effects

4. **Communication System**
   - Parent-child iframe messaging
   - Real-time project updates
   - Toast notifications

**Key Features:**
- Professional video editing interface
- Asset library integration
- Real-time collaboration
- Auto-save and version control

### **Stage 4: Analysis & Report (AnalysisStep)**
**Component:** `components/AnalysisStep.tsx` + `components/AnalysisResult.tsx`

**Process:**
1. **AI Performance Analysis**
   - Analyzes video concept against viral data
   - Provides optimization recommendations
   - Generates performance predictions

2. **Scoring System**
   - Viral potential score
   - Engagement metrics
   - Optimization suggestions

3. **Results Display**
   - Comprehensive analysis report
   - Performance metrics
   - Actionable recommendations

**Key Features:**
- AI-powered performance analysis
- Comprehensive scoring system
- Optimization recommendations
- Return to studio option

### **Stage 5: The Launchpad (Launchpad)**
**Component:** `components/Launchpad.tsx`

**Process:**
1. **SEO Generation** (1 credit)
   - AI-generated video description
   - Optimized tags and keywords
   - Copy-to-clipboard functionality

2. **Thumbnail Generation** (4 credits)
   - AI-analyzed thumbnail suggestions
   - Multiple thumbnail options
   - Platform-optimized designs

3. **Content Repurposing**
   - Convert long-form to short-form
   - Platform-specific adaptations
   - One-click repurposing

4. **YouTube Publishing**
   - Direct YouTube API integration
   - Automated upload with metadata
   - Performance tracking setup

**Key Features:**
- One-click YouTube publishing
- SEO optimization
- Content repurposing
- Performance tracking

## 🤖 **AI Services Integration**

### **Google Gemini 2.5 Flash**
**Primary Use:** Script generation, analysis, and optimization

**Functions:**
- `generateVideoBlueprint()` - Complete video blueprint generation
- `analyzeVideoConcept()` - Performance analysis
- `generateSeo()` - SEO optimization
- `repurposeProject()` - Content repurposing

**Features:**
- Structured JSON responses
- Brand identity integration
- Multiple video styles
- Platform-specific optimization

### **Google Imagen 3.0**
**Primary Use:** Visual asset generation

**Functions:**
- Moodboard image generation
- Storyboard image creation
- Thumbnail generation

**Features:**
- Aspect ratio optimization
- Safety filter handling
- Retry mechanisms
- Quality optimization

### **ElevenLabs**
**Primary Use:** AI voiceover generation

**Functions:**
- `generateVoiceover()` - Text-to-speech conversion

**Features:**
- Multiple voice options
- Natural-sounding audio
- Scene-specific voiceovers
- Quality optimization

### **RunwayML**
**Primary Use:** AI video generation

**Functions:**
- `generateRunwayVideoClip()` - Video clip generation

**Features:**
- Aspect ratio support
- Polling for completion
- Error handling
- Quality optimization

## 💾 **Data Management**

### **Project Structure**
```typescript
interface Project {
    id: string;
    name: string;
    topic: string;
    platform: Platform;
    videoSize: '16:9' | '9:16' | '1:1';
    status: ProjectStatus;
    workflowStep: WorkflowStep;
    title: string;
    script: Script | null;
    analysis: Analysis | null;
    moodboard: string[] | null;
    assets: Record<string, any>;
    shotstackEditJson: any | null;
    finalVideoUrl: string | null;
    publishedUrl: string | null;
    launchPlan: LaunchPlan | null;
    voiceoverUrls: Record<number, string> | null;
    lastUpdated: string;
}
```

### **Script Structure**
```typescript
interface Script {
    hooks: string[];
    selectedHookIndex?: number;
    scenes: Scene[];
    cta: string;
}

interface Scene {
    timecode: string;
    visual: string;
    voiceover: string;
    onScreenText: string;
    storyboardImageUrl?: string;
}
```

## 🔐 **Security & Authentication**

### **Supabase Integration**
- **Authentication:** Supabase Auth with email/password
- **Database:** PostgreSQL with Row Level Security
- **Storage:** Secure file storage with user isolation
- **Edge Functions:** Secure API proxying

### **API Security**
- All external API calls proxied through Supabase Edge Functions
- API keys stored securely on backend
- User authentication required for all operations
- Rate limiting and error handling

## 💳 **Credit System**

### **Credit Allocation**
- **Free Plan:** Limited credits per month
- **Paid Plans:** Increased credit limits
- **Credit Usage:**
  - Project creation: 1 credit
  - Blueprint generation: 5 credits
  - Voiceover generation: 1 credit per scene
  - SEO generation: 1 credit
  - Thumbnail generation: 4 credits
  - Content repurposing: 5 credits

### **Upgrade System**
- Automatic upgrade prompts when credits insufficient
- Multiple plan tiers available
- Seamless payment integration

## 📊 **Performance & Analytics**

### **Video Performance Tracking**
- YouTube API integration for real-time stats
- Performance analysis and predictions
- Engagement metrics tracking
- Optimization recommendations

### **User Analytics**
- Project completion rates
- Credit usage tracking
- Feature adoption metrics
- Performance insights

## 🔧 **Technical Implementation**

### **Build System**
- **Vite** for fast development and optimized builds
- **TypeScript** for type safety
- **Tailwind CSS** for responsive design
- **Pixi.js** integration for graphics

### **Deployment**
- **Netlify** for frontend hosting
- **Supabase** for backend services
- **CDN** for asset delivery
- **Environment variables** for configuration

## 🎯 **Key Features Summary**

### **AI-Powered Workflow**
1. **Prompt to Script** - AI generates complete video blueprint
2. **Visual Generation** - AI creates moodboard and storyboard images
3. **Voiceover Creation** - AI generates professional voiceovers
4. **Professional Editing** - Timeline-based video editor
5. **Performance Analysis** - AI analyzes viral potential
6. **One-Click Publishing** - Direct platform integration

### **Professional Tools**
- **Shotstack Studio SDK** for video editing
- **Multi-track timeline** editing
- **Asset library** integration
- **Real-time collaboration**
- **Auto-save functionality**

### **Platform Integration**
- **YouTube API** for publishing and analytics
- **SEO optimization** with AI-generated metadata
- **Content repurposing** for multiple platforms
- **Performance tracking** and analytics

## 🚀 **Future Enhancements**

### **Planned Features**
- **Multi-platform publishing** (TikTok, Instagram, LinkedIn)
- **Advanced analytics** dashboard
- **Collaboration tools** for teams
- **Template library** for common video types
- **Advanced AI models** for better generation

### **Technical Improvements**
- **Real-time collaboration** features
- **Advanced caching** for better performance
- **Mobile app** development
- **API rate limiting** optimization
- **Enhanced error handling**

---

This reference document provides a comprehensive overview of how the Viralyzaier platform works, from user input to final video publication. The platform leverages cutting-edge AI technology to democratize professional video creation, making it accessible to creators of all skill levels.
