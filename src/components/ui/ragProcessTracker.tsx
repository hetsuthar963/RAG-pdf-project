import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought"; // Update path if you use @/components/ui/...
import { CodeBlock, CodeBlockCode } from "@/components/ui/code-block";
import { Database, Search, Cpu } from "lucide-react";
import { RagMetadata } from "@/components/ChatComponent"; // Adjust import based on where you put the type


export function RagProcessTracker({ ragData }: { ragData: RagMetadata }) {
  if (!ragData) return null;

  return (
    <div className="w-full max-w-3xl mb-4">
      <ChainOfThought>
        {/* Step 1: Vector Search */}
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={<Search className="size-4" />}>
            Vector Search: Querying Pinecone
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>
              Querying index <strong>de-rag-pipeline</strong> for namespace:
              <span className="block mt-1 font-mono text-xs text-slate-500 bg-slate-100 p-1 rounded break-all">
                {ragData.namespace}
              </span>
            </ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        {/* Step 2: Context Extraction & Vector Display */}
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={<Database className="size-4" />}>
            Context Retrieval & Formatting
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>
              Extracted <strong>{ragData.contextLength} characters</strong> from <strong>{ragData.matches?.length || 0} chunks</strong>.
            </ChainOfThoughtItem>
            
            {/* Display Top Matches if they exist */}
            {ragData.matches && ragData.matches.length > 0 ? (
              <div className="flex flex-col gap-4 mt-3">
                {ragData.matches.map((match, idx) => (
                  <ChainOfThoughtItem key={idx} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Top Match {idx + 1}
                      </span>
                      {/* Dynamic Color coding based on Cosine Similarity Score */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        match.score > 0.8 ? 'bg-green-100 text-green-700' : 
                        match.score > 0.72 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        Score: {match.score.toFixed(3)}
                      </span>
                    </div>
                    
                    {/* Using Prompt-Kit CodeBlock to display the raw chunk safely */}
                    <CodeBlock className="mt-1 max-h-32 overflow-hidden relative">
                      <CodeBlockCode
                        code={match.text}
                        language="text"
                      />
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent" />
                    </CodeBlock>
                  </ChainOfThoughtItem>
                ))}
              </div>
            ) : (
              <ChainOfThoughtItem>
                <strong className="text-red-500">No context found above similarity threshold.</strong>
              </ChainOfThoughtItem>
            )}
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        {/* Step 3: LLM Generation */}
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={<Cpu className="size-4" />}>
            LLM Generation: DeepSeek-Chat
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>
              Constructed strictly grounded system prompt with RAG context block.
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              Generation completed in <strong>{ragData.executionTimeMs}ms</strong>.
            </ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
        
      </ChainOfThought>
    </div>
  );
}