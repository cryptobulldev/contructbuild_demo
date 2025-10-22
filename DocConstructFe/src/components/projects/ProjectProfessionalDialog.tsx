import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { Professional } from '../../types';
import { getProfessionals, addProfessionalToProject } from '../../api';
import {
  Button, DialogActions,
  DialogCloseButton,
  DialogContainer,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  Form,
  FullWidthField,
  Label,
  Select
} from "../../styles/SharedStyles";
import { errorHandler, ErrorResponseData } from "../shared/ErrorHandler";
import { toast } from "react-toastify";

interface ProjectProfessionalDialogProps {
  projectId: string;
  onClose: () => void;
  existingProfessionalIds: string[];
}

const ProjectProfessionalDialog: React.FC<ProjectProfessionalDialogProps> = ({
  projectId,
  onClose,
  existingProfessionalIds
}) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
          const data = await getProfessionals();
        // Filter out professionals that are already attached to the project
        const availableProfessionals = data.filter(
          prof => !existingProfessionalIds.includes(prof.id)
        );
        setProfessionals(availableProfessionals);
        if (availableProfessionals.length > 0) {
          setSelectedProfessionalId(availableProfessionals[0].id);
        }
      } catch (error) {
        errorHandler(error as ErrorResponseData, 'Failed to load professionals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessionals();
  }, [existingProfessionalIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessionalId) return;

    setLoading(true);
    try {
      await addProfessionalToProject({
        project_id: projectId,
        professional_id: selectedProfessionalId.toString() // Convert to string if the API expects a string
      });

      // Find the selected professional from the professionals array
      const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

      // Pass the selected professional to the onClose callback
      if (selectedProfessional) {
        onClose();
      } else {
        onClose();
      }
    } catch (error) {
      errorHandler(error as ErrorResponseData, 'הוספת בעל מקצוע לפרויקט נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogOverlay onClick={onClose}>
      <DialogContainer onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>הוסף בעלי מקצוע לפרויקט</DialogTitle>
          <DialogCloseButton onClick={onClose}>
            <FaTimes />
          </DialogCloseButton>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          {isLoading ? (
                <p>טוען בעלי מקצוע...</p>
              ) : professionals.length === 0 ? (
                <p>אין בעלי מקצוע זמינים להוספה</p>
          ) : (
            <>
              <FullWidthField style={{ margin: '20px 0' }}>
                <Label htmlFor="professional_id">בחר בעל מקצוע</Label>
                <Select
                  id="professional_id"
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  required
                >
                  {professionals.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} - {prof.professional_type} ({prof.status})
                    </option>
                  ))}
                </Select>
              </FullWidthField>
              <DialogActions>
                <Button variant='text' onClick={onClose}>בטל</Button>
                <Button 
                  variant='contained' 
                  type="submit" 
                  disabled={loading || professionals.length === 0}
                >
                  {loading ? 'מוסיף...' : 'הוסף בעל מקצוע'}
                </Button>
              </DialogActions>
            </>
          )}
        </Form>
      </DialogContainer>
    </DialogOverlay>
  );
};

export default ProjectProfessionalDialog;
