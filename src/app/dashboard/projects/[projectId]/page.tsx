import ProjectView from "@/components/project/ProjectView";

export default async function ProjectViewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params; // Await params to resolve the Promise
  return <ProjectView projectId={projectId} />;
}