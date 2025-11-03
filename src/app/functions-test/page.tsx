'use client';

import { useState } from 'react';
import { functionClientAPI } from '@/app/network/functions';

export default function FunctionsTestPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '90%', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        🧪 Firebase Functions Test Page
      </h1>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <StoryPagesTextTest />
        <StoryImagePromptTest />
        <KidAvatarImageTest />
        <StoryPageImageTest />
        <StoryCoverImageTest />
      </div>
    </div>
  );
}

// ============================================================================
// STORY PAGES TEXT TEST
// ============================================================================

function StoryPagesTextTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: 'John',
    problemDescription: 'John doesn\'t want to go to school',
    title: 'John\'s School Adventure',
    age: 8,
    advantages: 'Making friends, learning new things',
    disadvantages: 'Missing out on fun activities',
    accountId: 'test-account-123',
    userId: 'test-user-456',
    storyId: 'test-story-789',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await functionClientAPI.generateStoryPagesText(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestCard title="📝 Generate Story Pages Text">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Textarea
          label="Problem Description"
          value={formData.problemDescription}
          onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
        />
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <Input
          label="Age"
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
        />
        <Textarea
          label="Advantages"
          value={formData.advantages}
          onChange={(e) => setFormData({ ...formData, advantages: e.target.value })}
        />
        <Textarea
          label="Disadvantages"
          value={formData.disadvantages}
          onChange={(e) => setFormData({ ...formData, disadvantages: e.target.value })}
        />
        <Input
          label="Account ID"
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
        />
        <Input
          label="User ID"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />
        <Input
          label="Story ID"
          value={formData.storyId}
          onChange={(e) => setFormData({ ...formData, storyId: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Story'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}
      {result && <SuccessMessage data={result} />}
    </TestCard>
  );
}

// ============================================================================
// STORY IMAGE PROMPT TEST
// ============================================================================

function StoryImagePromptTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pageText: 'John woke up and didn\'t want to go to school. He thought about staying home and playing video games all day.',
    pageNum: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Prepare request data - only include pageNum if it's provided
      const requestData: any = {
        pageText: formData.pageText,
      };
      
      // Only add pageNum if it's provided and not empty
      if (formData.pageNum && formData.pageNum.trim() !== '') {
        requestData.pageNum = parseInt(formData.pageNum);
      }

      const response = await functionClientAPI.generateStoryImagePrompt(requestData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestCard title="🎨 Generate Story Image Prompt">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Textarea
          label="Page Text"
          value={formData.pageText}
          onChange={(e) => setFormData({ ...formData, pageText: e.target.value })}
        />
        <Input
          label="Page Number (optional - leave empty to generate for all pages)"
          type="number"
          value={formData.pageNum}
          onChange={(e) => setFormData({ ...formData, pageNum: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Image Prompt'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}
      {result && <SuccessMessage data={result} />}
    </TestCard>
  );
}

// ============================================================================
// KID AVATAR IMAGE TEST
// ============================================================================

function KidAvatarImageTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    imageUrl: 'https://example.com/kid-photo.jpg',
    accountId: 'test-account-123',
    userId: 'test-user-456',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await functionClientAPI.generateKidAvatarImage(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestCard title="👤 Generate Kid Avatar Image">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Image URL"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
        />
        <Input
          label="Account ID"
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
        />
        <Input
          label="User ID"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Avatar'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>✅ Avatar Generated!</h4>
          {result.imageUrl && (
            <img
              src={result.imageUrl}
              alt="Generated avatar"
              style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
            />
          )}
          <SuccessMessage data={result} />
        </div>
      )}
    </TestCard>
  );
}

// ============================================================================
// STORY PAGE IMAGE TEST
// ============================================================================

function StoryPageImageTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    imagePrompt: 'A bright, cheerful morning scene with a young boy in a colorful room',
    imageUrl: 'https://example.com/kid-photo.jpg',
    accountId: 'test-account-123',
    userId: 'test-user-456',
    storyId: 'test-story-789',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await functionClientAPI.generateStoryPageImage(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate page image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestCard title="🖼️ Generate Story Page Image">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Textarea
          label="Image Prompt"
          value={formData.imagePrompt}
          onChange={(e) => setFormData({ ...formData, imagePrompt: e.target.value })}
        />
        <Input
          label="Image URL"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
        />
        <Input
          label="Account ID"
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
        />
        <Input
          label="User ID"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />
        <Input
          label="Story ID"
          value={formData.storyId}
          onChange={(e) => setFormData({ ...formData, storyId: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Page Image'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>✅ Page Image Generated!</h4>
          {result.imageUrl && (
            <img
              src={result.imageUrl}
              alt="Generated page"
              style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
            />
          )}
          <SuccessMessage data={result} />
        </div>
      )}
    </TestCard>
  );
}

// ============================================================================
// STORY COVER IMAGE TEST
// ============================================================================

function StoryCoverImageTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: 'John\'s School Adventure',
    characterDescription: 'A brave 8-year-old boy with short brown hair',
    imageUrl: 'https://example.com/kid-photo.jpg',
    accountId: 'test-account-123',
    userId: 'test-user-456',
    storyId: 'test-story-789',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await functionClientAPI.generateStoryCoverImage(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TestCard title="🎨 Generate Story Cover Image">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <Textarea
          label="Character Description"
          value={formData.characterDescription}
          onChange={(e) => setFormData({ ...formData, characterDescription: e.target.value })}
        />
        <Input
          label="Image URL"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
        />
        <Input
          label="Account ID"
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
        />
        <Input
          label="User ID"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        />
        <Input
          label="Story ID"
          value={formData.storyId}
          onChange={(e) => setFormData({ ...formData, storyId: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Cover Image'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}
      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>✅ Cover Image Generated!</h4>
          {result.imageUrl && (
            <img
              src={result.imageUrl}
              alt="Generated cover"
              style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
            />
          )}
          <SuccessMessage data={result} />
        </div>
      )}
    </TestCard>
  );
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function TestCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '1.5rem',
        backgroundColor: '#fafafa',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{title}</h2>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          padding: '0.75rem',
          border: '1px solid #ccc',
          borderRadius: '6px',
          fontSize: '1rem',
        }}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        style={{
          padding: '0.75rem',
          border: '1px solid #ccc',
          borderRadius: '6px',
          fontSize: '1rem',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '8px',
        color: '#c00',
      }}
    >
      <strong>❌ Error:</strong> {message}
    </div>
  );
}

function SuccessMessage({ data }: { data: any }) {
  const handleCopy = () => {
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#efe',
        border: '1px solid #cfc',
        borderRadius: '8px',
        color: '#060',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <strong>✅ Success!</strong>
        <button
          onClick={handleCopy}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            alignSelf: 'flex-start',
          }}
        >
          📋 Copy
        </button>
      </div>
      <pre style={{ 
        marginTop: '0.5rem', 
        fontSize: '0.875rem', 
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'auto',
        padding: '0.5rem',
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '4px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

