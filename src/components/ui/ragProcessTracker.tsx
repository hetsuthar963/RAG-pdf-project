import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought";
import { CodeBlock, CodeBlockCode } from "@/components/ui/code-block";
import { Database, Search, Cpu } from "lucide-react";

export function RagProcessTracker() {
  return (
    <div className="w-full max-w-3xl mb-4">
      <ChainOfThought>
        {/* Step 1: Vector Search */}
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={<Search className="size-4" />}>
            Vector Search: Querying Pinecone Index
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>
              Querying index <strong>"de-rag-pipeline"</strong> for namespace:
              <span className="block mt-1 font-mono text-xs text-slate-500 bg-slate-100 p-1 rounded">
                uploads/1775905057774-Linux_Cheatsheet_With_Nano.pdf
              </span>
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              Matches returned: 5 valid vectors
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              Match scores: 0.1108, 0.1867, 0.2046, 0.1610, 0.2058
            </ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        {/* Step 2: Context Extraction */}
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={<Database className="size-4" />}>
            Context Retrieval & Formatting
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>
              Retrieved 5 documents for context assembly.
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              Truncated context to 3,000 characters to optimize token context window.
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              <strong>Context Preview:</strong>
              <CodeBlock className="mt-2 max-h-32 overflow-hidden relative">
                <CodeBlockCode
                  code={`CommandDescriptionExample sshRemote loginssh user@server scpCopy over SSHscp file user@host:/path Package Management (Debian/Ubuntu) CommandDescriptionExample apt updateUpdate packagesapt update...`}
                  language="text"
                />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent" />
              </CodeBlock>
            </ChainOfThoughtItem>
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
              Sending 3 sequenced messages (System, History, Human) to model.
            </ChainOfThoughtItem>
            <ChainOfThoughtItem>
              Response received successfully (1,181 chars).
            </ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      </ChainOfThought>
    </div>
  );
}