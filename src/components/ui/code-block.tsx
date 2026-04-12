"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"
import { createHighlighter, Highlighter } from "shiki"

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighterInstance(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "javascript",
        "typescript",
        "python",
        "java",
        "c",
        "cpp",
        "csharp",
        "go",
        "rust",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "scala",
        "html",
        "css",
        "json",
        "yaml",
        "markdown",
        "bash",
        "shell",
        "sql",
        "graphql",
        "docker",
        "plaintext",
      ],
    })
  }
  return highlighterPromise
}

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border",
        "border-border bg-card text-card-foreground rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "typescript",
  className,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDark(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function highlight() {
      try {
        const highlighter = await getHighlighterInstance()
        if (cancelled) return

        const loadedLangs = highlighter.getLoadedLanguages() as string[]
        const validLanguage = loadedLangs.includes(language) ? language : "plaintext"

        const html = highlighter.codeToHtml(code, {
          lang: validLanguage,
          theme: isDark ? "github-dark" : "github-light",
        })
        setHighlightedHtml(html)
      } catch (error) {
        console.error("Shiki highlighting error:", error)
        if (!cancelled) {
          setHighlightedHtml(`<pre><code>${code}</code></pre>`)
        }
      }
    }

    highlight()
    return () => { cancelled = true }
  }, [code, language, isDark])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4 [&>pre]:!bg-transparent [&>pre>code]:bg-transparent",
    className
  )

  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre className="px-4 py-4">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
