import FileCard from './FileCard'

const FileGrid = ({ files = [], ...actions }) => (
  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
    {files.map((file) => (
      <FileCard
        key={file.id}
        file={file}
        {...actions}
      />
    ))}
  </div>
)

export default FileGrid
