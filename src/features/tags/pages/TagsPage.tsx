import { useEffect } from 'react';
import { useModalStore } from '@/shared/stores/modalStore';
import { applyPageBackground } from '@/shared/utils/backgroundUtils';
import { Settings, Plus } from 'lucide-react';
import Button from '@/shared/ui/primitives/Button';
import TagColumnsView from '../components/TagColumnsView';
import { useGetTasksByTags } from '@/features/tags/api/tagTaskQueries';

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
                        <p className="text-text-primary">عرض المهام مجمعة حسب العلامات</p>
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
                    <div className="rounded-lg border border-status-danger-border bg-status-danger-bg0/10 p-4" role="alert">
                        <h5 className="text-lg font-bold text-text-primary mb-2">خطأ في تحميل البيانات</h5>
                        <p className="mb-0 text-text-primary">
                            حدث خطأ أثناء تحميل بيانات العلامات. يرجى المحاولة مرة أخرى لاحقاً.
                        </p>
                        <hr className="my-2 border-red-300" />
                        <small className="text-text-primary">
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
                    <p className="text-text-primary">عرض المهام مجمعة حسب العلامات</p>
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
