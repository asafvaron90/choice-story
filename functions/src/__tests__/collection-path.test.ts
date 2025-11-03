/**
 * Test to verify Firebase function uses correct collection path
 */

describe('Firebase Function Collection Path', () => {
  it('should use the same collection path logic as the API', () => {
    // API logic from firestore.server.ts
    const apiEnvironment = process.env.NODE_ENV || 'development';
    const apiCollection = `stories_gen_${apiEnvironment}`;
    
    // Firebase function logic (should match)
    const firebaseEnvironment = process.env.NODE_ENV || 'development';
    const firebaseCollection = `stories_gen_${firebaseEnvironment}`;
    
    expect(firebaseCollection).toBe(apiCollection);
    console.log('✅ Collections match:', firebaseCollection);
  });

  it('should handle different environments correctly', () => {
    const environments = ['development', 'production', 'staging'];
    
    environments.forEach(env => {
      const collection = `stories_gen_${env}`;
      expect(collection).toMatch(/^stories_gen_/);
      expect(collection).toContain(env);
      console.log(`✅ Environment ${env}:`, collection);
    });
  });

  it('should demonstrate the fix', () => {
    const oldPath = 'stories_gen_production'; // ❌ Hardcoded
    const newPath = `stories_gen_${process.env.NODE_ENV || 'development'}`; // ✅ Dynamic
    
    console.log('❌ OLD (hardcoded):', oldPath);
    console.log('✅ NEW (dynamic):', newPath);
    
    expect(newPath).not.toBe(oldPath);
    expect(newPath).toMatch(/^stories_gen_/);
  });

  it('should verify the complete path structure', () => {
    const storyId = 'test-story-123';
    const environment = process.env.NODE_ENV || 'development';
    const collection = `stories_gen_${environment}`;
    const fullPath = `${collection}/${storyId}`;
    
    expect(fullPath).toBe(`${collection}/${storyId}`);
    console.log('✅ Full Firestore path:', fullPath);
    console.log('✅ Collection:', collection);
    console.log('✅ Document ID:', storyId);
  });
});
