import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import "./App.css"

function App() {
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      addMessage('system', 'Invalid file type. Please upload PDF, TXT, or DOCX.');
      return;
    }

    // Check file size (limit to 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      addMessage('system', 'File size too large. Maximum 10MB allowed.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      await processDocument(selectedFile);
      addMessage('system', 'Document processed and added to knowledge base');
    } catch (error) {
      console.error('Error processing document:', error);
      addMessage('system', 'Error processing document: ' + error.message);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  // Process document function - Real implementation
  const processDocument = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('http://localhost:3001/api/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to process document');
    }

    return response.data;
  };

  // Chat message handler - Real implementation
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
  
    const userMessage = inputMessage;
    setInputMessage('');
    addMessage('user', userMessage);
    setIsChatLoading(true);
  
    try {
      const response = await axios.post('http://localhost:3001/api/chat', {
        message: userMessage
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      // Directly use the response data (non-streaming approach)
      addMessage('assistant', response.data.response);
  
      // If you want to show sources
      if (response.data.sources && response.data.sources.length > 0) {
        addMessage('system', `Sources: ${response.data.sources.join(', ')}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('system', 'Error getting response: ' + error.message);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // Remove the typing message logic since we're not streaming
  const addMessage = (sender, text, id = Date.now()) => {
    setMessages(prev => [...prev, { sender, text, id }]);
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>Document Upload</h2>
        <div className="upload-section">
          <input 
            ref={fileInputRef}
            type="file" 
            onChange={handleFileUpload} 
            disabled={isProcessing}
            accept=".pdf,.txt,.docx"
          />
          {isProcessing && (
            <div className="upload-progress">
              <progress value={uploadProgress} max="100" />
              <span>{uploadProgress}%</span>
              <p>Processing document...</p>
            </div>
          )}
          {file && !isProcessing && (
            <div className="file-info">
              <p>Loaded: {file.name}</p>
              <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>
      </div>

      <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.sender === 'assistant' ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

        <div className="chat-input">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isChatLoading}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isChatLoading}
          >
            {isChatLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

