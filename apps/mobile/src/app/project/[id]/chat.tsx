// ============================================================
// Jetdale — Workspace Chat Screen
// AI chat for asking questions about the project, requesting
// changes to artifacts, getting guidance. Streams responses.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { env } from '@/config/env';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifact_context: string | null;
  created_at: string;
}

export default function WorkspaceChatScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadHistory();
  }, [projectId]);

  async function loadHistory() {
    if (!projectId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'get_history',
            projectId,
            limit: 50,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setMessages(result.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;

    const messageText = input.trim();
    setInput('');
    setSending(true);
    setStreamingText('');

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      artifact_context: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'send_message',
            projectId,
            message: messageText,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        if (err.reason === 'rate_limited') {
          setStreamingText('Rate limit reached. Please wait a moment.');
        } else {
          setStreamingText(err.error || 'Failed to get response');
        }
        setSending(false);
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              setStreamingText(fullText);
            }
            if (parsed.done) {
              // Stream complete
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      // Add the AI message to the list
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        artifact_context: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setStreamingText('');
    } catch (err) {
      console.error('Chat error:', err);
      setStreamingText('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <Text style={styles.aiLabel}>Jetdale AI</Text>
        )}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isUser && styles.userTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Project Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>Start a conversation</Text>
              <Text style={styles.emptyChatText}>
                Ask questions about your project, request changes to artifacts,
                or get guidance on next steps.
              </Text>
            </View>
          }
          ListFooterComponent={
            streamingText ? (
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.aiLabel}>Jetdale AI</Text>
                <Text style={[styles.messageText, styles.aiText]}>{streamingText}</Text>
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 4 }} />
              </View>
            ) : null
          }
          onContentSizeChange={scrollToBottom}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your project..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          editable={!sending}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: '#1a1b18', backgroundColor: colors.ink },
  backText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.accent },
  headerTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.bodyLg, fontWeight: typography.weights.bold, color: colors.white },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  messageList: { padding: spacing[4], paddingBottom: spacing[2], flexGrow: 1 },

  messageBubble: { maxWidth: '85%', marginBottom: spacing[3], padding: spacing[3], borderRadius: radii.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1a1b18', borderLeftWidth: 3, borderLeftColor: colors.accent },

  aiLabel: { fontFamily: typography.families.mono, fontSize: typography.sizes.monoXs, color: colors.muted, marginBottom: 4, letterSpacing: 0.5 },
  messageText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, lineHeight: 22 },
  userText: { color: colors.white },
  aiText: { color: '#e0ddd6' },
  messageTime: { fontFamily: typography.families.mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  userTime: { color: 'rgba(255,255,255,0.6)' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing[16] },
  emptyChatTitle: { fontFamily: typography.families.display, fontSize: typography.sizes.displaySm, fontWeight: typography.weights.semibold, color: colors.white, marginBottom: spacing[2] },
  emptyChatText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.muted, textAlign: 'center', maxWidth: 300 },

  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing[3], gap: spacing[2], borderTopWidth: 1, borderTopColor: '#1a1b18', backgroundColor: colors.ink },
  textInput: { flex: 1, backgroundColor: '#1a1b18', borderRadius: radii.md, padding: spacing[3], fontFamily: typography.families.body, fontSize: typography.sizes.bodyMd, color: colors.white, maxHeight: 120, minHeight: 44 },
  sendButton: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing[3], paddingHorizontal: spacing[4], justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { fontFamily: typography.families.body, fontSize: typography.sizes.bodySm, fontWeight: typography.weights.semibold, color: colors.white },
});
