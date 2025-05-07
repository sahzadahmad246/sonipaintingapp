import ProjectForm from "@/components/project/ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params; // Await params to resolve the Promise
  return <ProjectForm projectId={projectId} />;
}