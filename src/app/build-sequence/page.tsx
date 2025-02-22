import { auth } from "@clerk/nextjs/server";

export default async function BuildSequencePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Please sign in to create sequences.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Build New Sequence</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-6">
          <input type="hidden" name="userId" value={userId} />
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Sequence Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* We'll add the sequence builder interface here in the next step */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600 text-center">Sequence builder coming soon...</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Create Sequence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 