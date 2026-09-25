import FileCard from './FileCard'

const FileGrid = ({ files = [], ...actions }) => (
  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4'>
    {files.map((file) => <FileCard key={file.id} file={file} {...actions} />)}
  </div>
)

export default FileGrid
