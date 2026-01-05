import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import Spinner from './Spinner';

const TABS = [
  { id: 'quick', label: 'Quick' },
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'template', label: 'Template' },
  { id: 'voice', label: 'Voice' },
];

const QUICK_REACTIONS = [
  'Short answer',
  "I don't know yet",
  'Not ready',
  "Let's talk live",
  'Voice note coming',
  'Need cooldown',
  'I can answer later',
];

const BUDGETS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

export default function ResponseComposer({ questionId, onResponseCreated, existingDraft }) {
  const [activeTab, setActiveTab] = useState('short');
  const [bodyText, setBodyText] = useState(existingDraft?.bodyText || '');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({});
  const [templates, setTemplates] = useState([]);
  const [answerBudget, setAnswerBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadTemplates = async () => {
    try {
      const data = await api.get('/templates');
      setTemplates(data.templates.filter(t => t.isEnabled));
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleSubmit = async (isDraft = false) => {
    setLoading(true);
    setError(null);
    
    try {
      let type, data;
      
      switch (activeTab) {
        case 'quick':
          if (!bodyText) {
            setError('Select a quick reaction');
            setLoading(false);
            return;
          }
          type = 'quick_reaction';
          data = { bodyText };
          break;
          
        case 'short':
          if (!bodyText.trim()) {
            setError('Write your response');
            setLoading(false);
            return;
          }
          type = 'text_short';
          data = { bodyText: bodyText.trim() };
          break;
          
        case 'long':
          if (!bodyText.trim()) {
            setError('Write your response');
            setLoading(false);
            return;
          }
          type = 'text_long';
          data = { bodyText: bodyText.trim(), answerBudget };
          break;
          
        case 'template':
          if (!selectedTemplate) {
            setError('Select a template');
            setLoading(false);
            return;
          }
          type = 'template';
          data = { 
            templateName: selectedTemplate.name, 
            templateData,
          };
          break;
          
        case 'voice':
          if (!audioBlob) {
            setError('Record a voice note first');
            setLoading(false);
            return;
          }
          // Handle voice upload separately
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');
          formData.append('questionId', questionId);
          formData.append('duration', recordingDuration);
          
          await api.upload('/responses/voice', formData);
          setAudioBlob(null);
          setRecordingDuration(0);
          onResponseCreated?.();
          setLoading(false);
          return;
      }
      
      await api.post('/responses', {
        questionId,
        type,
        isDraft,
        ...data,
      });
      
      // Reset form
      setBodyText('');
      setTemplateData({});
      setSelectedTemplate(null);
      onResponseCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err) {
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-sand-200 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-ink-900 border-b-2 border-ink-900'
                : 'text-ink-500 hover:text-ink-700'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Quick reactions */}
        {activeTab === 'quick' && (
          <div className="flex flex-wrap gap-2">
            {QUICK_REACTIONS.map(reaction => (
              <button
                key={reaction}
                onClick={() => setBodyText(reaction)}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-colors
                  ${bodyText === reaction
                    ? 'bg-sage-500 text-white'
                    : 'bg-sand-100 text-ink-700 hover:bg-sand-200'
                  }
                `}
              >
                {reaction}
              </button>
            ))}
          </div>
        )}

        {/* Short answer */}
        {activeTab === 'short' && (
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Write a short response..."
            className="input min-h-[100px] resize-y"
            maxLength={500}
          />
        )}

        {/* Long form */}
        {activeTab === 'long' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-ink-500">Answer budget:</span>
              {BUDGETS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setAnswerBudget(answerBudget === b.value ? null : b.value)}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-colors
                    ${answerBudget === b.value
                      ? 'bg-sage-100 text-sage-700'
                      : 'bg-sand-100 text-ink-600 hover:bg-sand-200'
                    }
                  `}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Take your time writing..."
              className="input min-h-[200px] resize-y"
            />
          </>
        )}

        {/* Template */}
        {activeTab === 'template' && (
          <>
            {!selectedTemplate ? (
              <div className="space-y-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className="w-full text-left p-3 rounded border border-sand-200 hover:border-sage-300 transition-colors"
                  >
                    <p className="font-medium text-ink-800">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-xs text-ink-500 mt-0.5">{tpl.description}</p>
                    )}
                  </button>
                ))}
                {templates.length === 0 && (
                  <p className="text-sm text-ink-500 text-center py-4">
                    No templates available
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-ink-800">{selectedTemplate.name}</p>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTemplateData({});
                    }}
                    className="text-xs text-ink-500 hover:text-ink-700"
                  >
                    Change template
                  </button>
                </div>
                <div className="space-y-4">
                  {selectedTemplate.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-ink-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={templateData[field.key] || ''}
                          onChange={(e) => setTemplateData(prev => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))}
                          className="input min-h-[80px] resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={templateData[field.key] || ''}
                          onChange={(e) => setTemplateData(prev => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))}
                          className="input"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Voice */}
        {activeTab === 'voice' && (
          <div className="text-center py-4">
            {!audioBlob ? (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3
                    transition-colors
                    ${isRecording
                      ? 'bg-rust-500 text-white animate-pulse'
                      : 'bg-sage-500 text-white hover:bg-sage-600'
                    }
                  `}
                >
                  {isRecording ? (
                    <StopIcon className="w-6 h-6" />
                  ) : (
                    <MicIcon className="w-6 h-6" />
                  )}
                </button>
                <p className="text-sm text-ink-600">
                  {isRecording
                    ? `Recording... ${formatDuration(recordingDuration)}`
                    : 'Tap to record'
                  }
                </p>
                {recordingDuration >= 120 && (
                  <p className="text-xs text-rust-600 mt-1">
                    Max 2 minutes
                  </p>
                )}
              </>
            ) : (
              <>
                <audio
                  controls
                  src={URL.createObjectURL(audioBlob)}
                  className="mx-auto mb-3"
                />
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setRecordingDuration(0);
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    Re-record
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-rust-600 bg-rust-50 px-3 py-2 rounded mt-3">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-sand-200">
          {activeTab !== 'quick' && activeTab !== 'voice' && (
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="btn btn-ghost text-sm"
            >
              Save draft
            </button>
          )}
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? <Spinner size="sm" /> : 'Send response'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}


