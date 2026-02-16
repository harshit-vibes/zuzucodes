/**
 * Split MDX content into sections by --- delimiter.
 */
export function splitMdxSections(mdxContent: string): string[] {
  return mdxContent
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Get a single MDX section by 0-based index.
 */
export function getMdxSection(
  mdxContent: string,
  index: number
): string | null {
  const sections = splitMdxSections(mdxContent);
  return sections[index] ?? null;
}

/**
 * Extract the first H1 or H2 heading from a section as its title.
 */
export function getMdxSectionTitle(section: string): string {
  const match = section.match(/^#{1,2}\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Extract titles from all sections in an MDX document.
 */
export function getMdxSectionTitles(mdxContent: string): string[] {
  return splitMdxSections(mdxContent).map(getMdxSectionTitle);
}
