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
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 className="page-title mb-1">العلامات</h1>
                        <p className="text-muted">عرض المهام مجمعة حسب العلامات</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button 
                            onClick={handleAddTag} 
                            variant="outline-primary"
                            className="d-flex align-items-center"
                        >
                            <Plus size={16} className="me-2" />
                            علامة جديدة
                        </Button>
                        <Button 
                            onClick={handleManageTags} 
                            className="d-flex align-items-center"
                        >
                            <Settings size={16} className="me-2" />
                            إدارة العلامات
                        </Button>
                    </div>
                </div>

                <div className="text-center py-5">
                    <div className="alert alert-danger" role="alert">
                        <h5 className="alert-heading">خطأ في تحميل البيانات</h5>
                        <p className="mb-0">
                            حدث خطأ أثناء تحميل بيانات العلامات. يرجى المحاولة مرة أخرى لاحقاً.
                        </p>
                        <hr />
                        <small className="text-muted">
                            {error instanceof Error ? error.message : 'Unknown error'}
                        </small>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tags-page">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="page-title mb-1">العلامات</h1>
                    <p className="text-muted">عرض المهام مجمعة حسب العلامات</p>
                </div>
                <div className="d-flex gap-2">
                    <Button 
                        onClick={handleAddTag} 
                        variant="outline-primary"
                        className="d-flex align-items-center"
                    >
                        <Plus size={16} className="me-2" />
                        علامة جديدة
                    </Button>
                    <Button 
                        onClick={handleManageTags} 
                        className="d-flex align-items-center"
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
