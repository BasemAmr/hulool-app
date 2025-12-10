import { useEffect } from 'react';
import { useModalStore } from '../stores/modalStore';
import { applyPageBackground } from '../utils/backgroundUtils';
import { Settings, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import TagColumnsView from '../components/tags/TagColumnsView';
import { useGetTasksByTags } from '../queries/tagTaskQueries';

const TagsPage = () => {
    const openModal = useModalStore((state) => state.openModal);

    const { data: tagCollections = [], isLoading, error } = useGetTasksByTags();

    const handleManageTags = () => openModal('tagManagement', {});
    const handleAddTag = () => openModal('tagForm', {});

    // Apply tags page background
    useEffect(() => {
        applyPageBackground('tags');
    }, []);

    // Handle API errors
    if (error) {
        return (
            <div className="tags-page">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">العلامات</h1>
                        <p className="text-black">عرض المهام مجمعة حسب العلامات</p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleAddTag} 
                            variant="outline-primary"
                            className="flex items-center"
                        >
                            <Plus size={16} className="me-2" />
                            علامة جديدة
                        </Button>
                        <Button 
                            onClick={handleManageTags} 
                            className="flex items-center"
                        >
                            <Settings size={16} className="me-2" />
                            إدارة العلامات
                        </Button>
                    </div>
                </div>

                <div className="text-center py-5">
                    <div className="rounded-lg border border-red-500 bg-red-500/10 p-4" role="alert">
                        <h5 className="text-lg font-bold text-black mb-2">خطأ في تحميل البيانات</h5>
                        <p className="mb-0 text-black">
                            حدث خطأ أثناء تحميل بيانات العلامات. يرجى المحاولة مرة أخرى لاحقاً.
                        </p>
                        <hr className="my-2 border-red-300" />
                        <small className="text-black">
                            {error instanceof Error ? error.message : 'Unknown error'}
                        </small>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tags-page">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">العلامات</h1>
                    <p className="text-black">عرض المهام مجمعة حسب العلامات</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleAddTag} 
                        variant="outline-primary"
                        className="flex items-center"
                    >
                        <Plus size={16} className="me-2" />
                        علامة جديدة
                    </Button>
                    <Button 
                        onClick={handleManageTags} 
                        className="flex items-center"
                    >
                        <Settings size={16} className="me-2" />
                        إدارة العلامات
                    </Button>
                </div>
            </div>

            <TagColumnsView 
                tagCollections={tagCollections} 
                isLoading={isLoading} 
            />
        </div>
    );
};

export default TagsPage;
