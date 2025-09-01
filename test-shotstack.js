// Test file to verify Shotstack Studio SDK loading
console.log('🧪 Testing Shotstack Studio SDK import...');

try {
    // Test dynamic import
    import('@shotstack/shotstack-studio').then((module) => {
        console.log('✅ Shotstack Studio SDK imported successfully');
        console.log('Available exports:', Object.keys(module));
        
        // Test if key components are available
        if (module.Canvas) console.log('✅ Canvas component available');
        if (module.Controls) console.log('✅ Controls component available');
        if (module.Edit) console.log('✅ Edit component available');
        if (module.Timeline) console.log('✅ Timeline component available');
        if (module.VideoExporter) console.log('✅ VideoExporter component available');
        
        // Test basic initialization
        try {
            const edit = new module.Edit();
            console.log('✅ Edit instance created successfully');
            
            const size = { width: 1920, height: 1080 };
            const canvas = new module.Canvas(size, edit);
            console.log('✅ Canvas instance created successfully');
            
            const timeline = new module.Timeline();
            console.log('✅ Timeline instance created successfully');
            
            const controls = new module.Controls();
            console.log('✅ Controls instance created successfully');
            
            console.log('🎉 All Shotstack Studio SDK components initialized successfully!');
            
        } catch (initError) {
            console.error('❌ Failed to initialize SDK components:', initError);
        }
        
    }).catch((importError) => {
        console.error('❌ Failed to import Shotstack Studio SDK:', importError);
    });
    
} catch (error) {
    console.error('❌ Error setting up import test:', error);
}
